const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { MVP_PLANTS } = require('./plantRules');
const plantDetailsMap = require('./plantDetails');
    
     const app = express();
     const PORT = process.env.PORT || 5000;

     // Import routes
     const authRoutes = require('./auth');
     const multer = require('multer');
     const FormData = require('form-data');
     const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
     
     const upload = multer({ storage: multer.memoryStorage() });

     // Configure Multer for Community Plant Uploads
     const plantStorage = multer.diskStorage({
       destination: function (req, file, cb) {
         const uploadDir = path.join(__dirname, 'uploads/plants');
         if (!fs.existsSync(uploadDir)) {
           fs.mkdirSync(uploadDir, { recursive: true });
         }
         cb(null, uploadDir);
       },
       filename: function (req, file, cb) {
         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
         cb(null, 'plant-' + uniqueSuffix + path.extname(file.originalname));
       }
     });

     const uploadPlant = multer({ storage: plantStorage });

     // Middleware
     app.use(cors());
     app.use(express.json());
     app.use('/plants', express.static(path.join(__dirname, '../public/plants')));
     app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

     // Routes
     app.use('/api/auth', authRoutes);

     // Test Database Connection and Initialize Tables
     const db = require('./db');
     
     const initDB = async () => {
       try {
         await db.execute('SELECT 1');
         console.log('✅ Connected to MySQL database');

         // Create users table if not exists
         await db.execute(`
           CREATE TABLE IF NOT EXISTS users (
             id INT AUTO_INCREMENT PRIMARY KEY,
             full_name VARCHAR(255) NOT NULL,
             email VARCHAR(255) NOT NULL UNIQUE,
             password VARCHAR(255),
             role VARCHAR(50) DEFAULT 'User',
             profile_image VARCHAR(255),
             phone_number VARCHAR(20),
             preferred_location VARCHAR(255),
             google_id VARCHAR(255) UNIQUE,
             apple_id VARCHAR(255) UNIQUE,
             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
           )
         `);

         // Migration: Add columns to existing table if they don't exist
         const userColumns = [
           { name: 'google_id', type: 'VARCHAR(255) UNIQUE' },
           { name: 'apple_id', type: 'VARCHAR(255) UNIQUE' },
           { name: 'github_id', type: 'VARCHAR(255) UNIQUE' },
           { name: 'phone_number', type: 'VARCHAR(20)' },
           { name: 'role', type: "VARCHAR(50) DEFAULT 'User'" },
           { name: 'profile_image', type: 'VARCHAR(255)' },
           { name: 'preferred_location', type: 'VARCHAR(255)' },
           { name: 'github_handle', type: 'VARCHAR(255)' }
         ];

         for (const col of userColumns) {
           try {
             await db.execute(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
             console.log(`✅ Added missing user column: ${col.name}`);
           } catch (err) {
             // Column likely already exists or other non-critical error
           }
         }
         
         try {
           await db.execute('ALTER TABLE users MODIFY password VARCHAR(255) NULL');
         } catch (err) {}

         // Create payment_sessions table
         await db.execute(`
           CREATE TABLE IF NOT EXISTS payment_sessions (
             id VARCHAR(255) PRIMARY KEY,
             user_id INT,
             cart_items LONGTEXT,
             total_amount INT,
             status VARCHAR(50) DEFAULT 'pending',
             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
           )
         `);

         // Create login_history table if not exists
         await db.execute(`
           CREATE TABLE IF NOT EXISTS login_history (
             id INT AUTO_INCREMENT PRIMARY KEY,
             full_name VARCHAR(255) NOT NULL,
             email VARCHAR(255) NOT NULL,
             password VARCHAR(255) NOT NULL,
             signup_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
             login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
           )
         `);

          // Create Plants Table
          await db.execute(`CREATE TABLE IF NOT EXISTS plants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(255) NOT NULL,
            price VARCHAR(255) NOT NULL,
            location VARCHAR(255) NOT NULL,
            image VARCHAR(255) NOT NULL,
            space_tag VARCHAR(255) NOT NULL,
            sunlight_need VARCHAR(50) NOT NULL,
            min_temp INT DEFAULT 10,
            max_temp INT DEFAULT 35,
            purification_score INT DEFAULT 5,
            rule VARCHAR(255),
            scientific_name VARCHAR(255),
            nepali_name VARCHAR(255),
            english_name VARCHAR(255),
            description TEXT,
            is_sold TINYINT(1) DEFAULT 0,
            buyer_id INT,
            tips_unlocked TINYINT(1) DEFAULT 0
          ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

          try {
            await db.execute('ALTER TABLE plants CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
          } catch (e) {}

          // Alter table dynamically to add new columns if they do not exist
          const columnsToFix = [
            { name: 'scientific_name', type: 'VARCHAR(255)' },
            { name: 'nepali_name', type: 'VARCHAR(255)' },
            { name: 'english_name', type: 'VARCHAR(255)' },
            { name: 'description', type: 'TEXT' },
            { name: 'tips_unlocked', type: 'TINYINT(1) DEFAULT 0' },
            { name: 'rule', type: 'VARCHAR(255)' },
            { name: 'purification_score', type: 'INT DEFAULT 5' },
            { name: 'min_temp', type: 'INT DEFAULT 10' },
            { name: 'max_temp', type: 'INT DEFAULT 35' },
            { name: 'sunlight_need', type: 'VARCHAR(50)' },
            { name: 'space_tag', type: 'VARCHAR(255)' }
          ];

          for (const col of columnsToFix) {
            try {
              await db.execute(`ALTER TABLE plants ADD COLUMN ${col.name} ${col.type}`);
              console.log(`✅ Added missing column: ${col.name}`);
            } catch (err) {
              // Column likely already exists
            }
          }

          // P2P Marketplace Schema Update
          const p2pColumns = [
            { name: 'seller_id', type: 'INT' },
            { name: 'listing_type', type: 'VARCHAR(50)' }, // 'sale', 'exchange', 'both'
            { name: 'is_listed', type: 'TINYINT(1) DEFAULT 0' },
            { name: 'original_price', type: 'VARCHAR(255)' },
            { name: 'available', type: 'TINYINT(1) DEFAULT 1' },
            { name: 'nursery_id', type: 'INT' },
            { name: 'nursery_name', type: 'VARCHAR(255)' },
            { name: 'nursery_external_id', type: 'VARCHAR(255)' },
            { name: 'nursery_location', type: 'VARCHAR(255)' },
            { name: 'nursery_phone', type: 'VARCHAR(50)' }
          ];

          for (const col of p2pColumns) {
            try {
              await db.execute(`ALTER TABLE plants ADD COLUMN ${col.name} ${col.type}`);
              console.log(`✅ Added P2P column: ${col.name}`);
            } catch (err) {}
          }

          await db.execute(`
            CREATE TABLE IF NOT EXISTS nurseries (
              id INT AUTO_INCREMENT PRIMARY KEY,
              external_id VARCHAR(255) UNIQUE,
              nursery_name VARCHAR(255) NOT NULL,
              owner_name VARCHAR(255),
              email VARCHAR(255) UNIQUE,
              phone VARCHAR(50),
              address VARCHAR(255),
              password VARCHAR(255),
              role VARCHAR(50) DEFAULT 'User',
              profile_image VARCHAR(255),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          // Migration: Add password column if it doesn't exist
          try {
            await db.execute('ALTER TABLE nurseries ADD COLUMN password VARCHAR(255)');
            console.log('✅ Added password column to nurseries table');
          } catch (err) {}

          try {
            await db.execute('ALTER TABLE nurseries ADD UNIQUE (email)');
          } catch (err) {}

          console.log('✅ Nurseries table initialized');

          // Create Trade Requests Table
          await db.execute(`
            CREATE TABLE IF NOT EXISTS trade_requests (
              id INT AUTO_INCREMENT PRIMARY KEY,
              sender_id VARCHAR(255) NOT NULL,
              receiver_id VARCHAR(255),
              plant_id VARCHAR(255) NOT NULL,
              request_type VARCHAR(50) NOT NULL, -- 'buy' or 'exchange'
              status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
              offer_details TEXT,
              receiver_seen TINYINT(1) DEFAULT 0,
              sender_seen TINYINT(1) DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Alter column types if table already existed with INT types
          const columnTypeFixes = [
            'ALTER TABLE trade_requests MODIFY sender_id VARCHAR(255) NOT NULL',
            'ALTER TABLE trade_requests MODIFY receiver_id VARCHAR(255) NULL',
            'ALTER TABLE trade_requests MODIFY plant_id VARCHAR(255) NOT NULL'
          ];
          for (const sql of columnTypeFixes) {
            try { await db.execute(sql); } catch (e) {}
          }
          console.log('✅ Trade requests table initialized');

          // Add missing columns if table already exists
          const tradeCols = [
            { name: 'receiver_seen', type: 'TINYINT(1) DEFAULT 0' },
            { name: 'sender_seen', type: 'TINYINT(1) DEFAULT 0' }
          ];
          for (const col of tradeCols) {
            try {
              await db.execute(`ALTER TABLE trade_requests ADD COLUMN ${col.name} ${col.type}`);
              console.log(`✅ Added column to trade_requests: ${col.name}`);
            } catch (err) {}
          }

          // Seed initial data if table is empty
          const [rows] = await db.execute('SELECT COUNT(*) as count FROM plants');
          if (rows[0].count === 0) {
            console.log('Seeding initial plant data...');
            const insertQuery = 'INSERT INTO plants (name, type, price, location, image, space_tag, sunlight_need, min_temp, max_temp, purification_score, rule, scientific_name, nepali_name, english_name, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            
            for (const plant of MVP_PLANTS) {
              const detail = plantDetailsMap[plant.name] || {};
              await db.execute(insertQuery, [
                plant.name, 
                plant.type, 
                plant.price, 
                plant.location, 
                plant.image, 
                plant.space_tag, 
                plant.sunlight_need, 
                plant.min_temp, 
                plant.max_temp, 
                plant.purification_score,
                plant.rule || '',
                detail.scientificName || '',
                detail.nepaliName || '',
                detail.englishName || plant.name,
                detail.description || ''
              ]);
            }
            console.log('✅ MVP seed plants added to database');
          }

          // Backfill & repair details for all existing plants (overwriting any question mark corruptions)
          console.log('Backfilling and repairing plant details into database...');
          for (const [name, detail] of Object.entries(plantDetailsMap)) {
            await db.execute(
              'UPDATE plants SET scientific_name = ?, nepali_name = ?, english_name = ?, description = ? WHERE LOWER(name) = LOWER(?) OR nepali_name LIKE "%?%"',
              [detail.scientificName, detail.nepaliName, detail.englishName, detail.description, name]
            );
          }
          console.log('✅ Backfilling & UTF-8 repair completed successfully');
          
          // Comprehensive Fix for Peace Lily image path inconsistency
          await db.execute(
            "UPDATE plants SET image = '/plants/PeaceLily/1.jpg' WHERE LOWER(name) = 'peace lily' AND image != '/plants/PeaceLily/1.jpg'"
          );
          console.log('✅ Synchronized Peace Lily image paths in database');
          
          console.log('✅ Database tables initialized');
       } catch (err) {
         console.error('❌ Database initialization failed:', err.message);
       }
     };

     initDB();

     function isTableMissingError(error) {
       return error && (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146);
     }

     function isPermissionError(error) {
       if (!error) return false;
       const permissionCodes = new Set([
         'ER_DBACCESS_DENIED_ERROR',
         'ER_ACCESS_DENIED_ERROR',
         'ER_TABLEACCESS_DENIED_ERROR',
         'ER_SPECIFIC_ACCESS_DENIED_ERROR'
       ]);
       return permissionCodes.has(error.code);
     }

     async function tableExists(tableName) {
       try {
         await db.execute(`SELECT 1 FROM ${tableName} LIMIT 1`);
         return true;
       } catch (error) {
         if (isTableMissingError(error)) {
           return false;
         }
         // For any other DB issue, don't block request-time flows here.
         console.warn(`[DB] Table existence check failed for ${tableName}:`, error.code || error.message);
         return true;
       }
     }

     async function safeSchemaExecute(sql, context) {
       try {
         await db.execute(sql);
         return true;
       } catch (error) {
         const detail = error.code || error.message;
         if (isPermissionError(error)) {
           console.warn(`[DB] Skipping schema change (${context}) due to limited DB permissions: ${detail}`);
           return false;
         }
         console.warn(`[DB] Schema change warning (${context}): ${detail}`);
         return false;
       }
     }

     async function ensurePaymentSessionsTable() {
       const exists = await tableExists('payment_sessions');
       if (exists) return;

       await safeSchemaExecute(`
         CREATE TABLE IF NOT EXISTS payment_sessions (
           id VARCHAR(255) PRIMARY KEY,
           user_id INT,
           cart_items LONGTEXT,
           total_amount INT,
           status VARCHAR(50) DEFAULT 'pending',
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )
       `, 'create payment_sessions');
     }

     async function ensureTradeRequestsTable() {
       const exists = await tableExists('trade_requests');
       if (!exists) {
         await safeSchemaExecute(`
         CREATE TABLE IF NOT EXISTS trade_requests (
           id INT AUTO_INCREMENT PRIMARY KEY,
           sender_id VARCHAR(255) NOT NULL,
           receiver_id VARCHAR(255),
           plant_id VARCHAR(255) NOT NULL,
           request_type VARCHAR(50) NOT NULL,
           status VARCHAR(50) DEFAULT 'pending',
           offer_details TEXT,
           receiver_seen TINYINT(1) DEFAULT 0,
           sender_seen TINYINT(1) DEFAULT 0,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )
       `, 'create trade_requests');
       }

       await safeSchemaExecute('ALTER TABLE trade_requests MODIFY sender_id VARCHAR(255) NOT NULL', 'alter trade_requests sender_id');
       await safeSchemaExecute('ALTER TABLE trade_requests MODIFY receiver_id VARCHAR(255) NULL', 'alter trade_requests receiver_id');
       await safeSchemaExecute('ALTER TABLE trade_requests MODIFY plant_id VARCHAR(255) NOT NULL', 'alter trade_requests plant_id');
       await safeSchemaExecute('ALTER TABLE trade_requests ADD COLUMN receiver_seen TINYINT(1) DEFAULT 0', 'alter trade_requests receiver_seen');
       await safeSchemaExecute('ALTER TABLE trade_requests ADD COLUMN sender_seen TINYINT(1) DEFAULT 0', 'alter trade_requests sender_seen');
     }

     // --- Marketplace Endpoints ---

     // Helper for fetching weather data (Monthly Average)
     async function getMonthlyAverage(city) {
       try {
         const API_KEY = 'TFWSDCS3ZFEDCCJUHYLQHR7GD';
         const month = new Date().getMonth() + 1; // 1-12
         const currentYear = new Date().getFullYear();

         const date1 = `${currentYear}-${month.toString().padStart(2, '0')}-01`;
         const date2 = `${currentYear}-${month.toString().padStart(2, '0')}-28`;

         const cleanCity = (city || 'Kathmandu').split(',')[0].trim();

         const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(cleanCity)}/${date1}/${date2}?unitGroup=metric&include=stats&key=${API_KEY}&contentType=json`;

         const response = await fetch(url);
         if (!response.ok) throw new Error(`Weather API returned ${response.status}`);

         const data = await response.json();
         return data.currentConditions?.temp || data.days?.[0]?.temp || 22;
       } catch (error) {
         console.error('Weather API Error:', error.message);
         return 22; // Default safe temp for recommendations
       }
     }

     /**
      * SMART RECOMMENDATION SYSTEM (36 Combinations)
      * 3 Temperature Levels x 4 Spaces x 3 Light Levels (3x4x3)
      */
     app.get('/api/recommend', async (req, res) => {
       try {
         const { space, sunlight, location } = req.query;

         if (!space || !sunlight || !location) {
           return res.status(400).json({ error: 'Missing required parameters: space, sunlight, and location are required.' });
         }
         
         // 1. Environmental Context
         const detectedTemp = await getMonthlyAverage(location);
         
         // Temperature Levels: 1 (Cold < 15), 2 (Moderate 15-25), 3 (Warm > 25)
         let tempLevel = 2;
         if (detectedTemp < 15) tempLevel = 1;
         else if (detectedTemp > 25) tempLevel = 3;

         const lightMap = { 'Low': 1, 'Medium': 2, 'High': 3 };
         const lightVal = lightMap[sunlight] || 2;

         // 2. Identify the specific profile out of 36 (3x4x3)
         const spaceOptions = ['indoor', 'balcony', 'rooftop', 'garden'];
         const spaceIdx = spaceOptions.indexOf(space?.toLowerCase()) || 0;
         
         // Calculation: (TempLevel-1 * 12) + (SpaceIdx * 3) + LightVal
         const profileId = ((tempLevel - 1) * 12) + (spaceIdx * 3) + lightVal;

         console.log(`[RECOMMEND] Profile #${profileId}/36 | Temp=${detectedTemp}°C (Lvl ${tempLevel}), Space=${space}, Light=${sunlight}`);
         
         // 3. Build Dynamic Query based on Plant Rules
         let query = 'SELECT * FROM plants WHERE is_sold = 0';
         const params = [];

         if (space && space !== 'Any') {
           query += ' AND LOWER(space_tag) LIKE ?';
           params.push(`%${space.toLowerCase()}%`);
         }

         if (sunlight && sunlight !== 'Any') {
           query += ' AND CAST(sunlight_need AS UNSIGNED) <= ?';
           params.push(lightVal);
         }

         // Temperature Rule
         const finalQuery = query + ' AND ? BETWEEN min_temp AND max_temp';
         const finalParams = [...params, Math.round(detectedTemp)];
         
         let [plants] = await db.execute(finalQuery, finalParams);
         let note = `Found ${plants.length} plant(s) perfectly matching Profile #${profileId} (3x4x3 Matrix).`;

         console.log(`[RECOMMEND] Match count: ${plants.length} for Profile #${profileId}`);

         // 4. Smart Fallbacks (Relaxing constraints systematically)
         if (plants.length === 0) {
           console.log('[RECOMMEND] No climate matches. Relaxing climate constraint.');
           [plants] = await db.execute(query, params);
           note = "Climate threshold relaxed for best-fit recommendation.";
         }

         if (plants.length === 0) {
           console.log('[RECOMMEND] Still no matches. Relaxing sunlight constraint.');
           let basicQuery = 'SELECT * FROM plants WHERE is_sold = 0';
           const basicParams = [];
           if (space && space !== 'Any') {
             basicQuery += ' AND LOWER(space_tag) LIKE ?';
             basicParams.push(`%${space.toLowerCase()}%`);
           }
           [plants] = await db.execute(basicQuery, basicParams);
           note = "Search broadened to find any suitable plants for your space.";
         }

         res.json({
           summary: {
             location: location || 'Kathmandu',
             averageTemp: `${Math.round(detectedTemp)}°C`,
             space: space || 'Indoor',
             sunlight: sunlight || 'Medium',
             profileId: profileId,
             note: note
           },
           plants: plants
         });
       } catch (error) {
         console.error('[RECOMMEND] Error:', error);
         res.status(500).json({ error: 'Failed to generate plant arrangements' });
       }
     });

     app.get('/api/plants', async (req, res) => {
       try {
         const [plants] = await db.execute('SELECT * FROM plants WHERE is_sold = 0 AND (available IS NULL OR available = 1)');
         res.json(plants);
       } catch (error) {
         res.status(500).json({ error: 'Failed to fetch plants' });
       }
     });

      app.get('/api/plants/:id/images', async (req, res) => {
        try {
          const { id } = req.params;
          const [rows] = await db.execute('SELECT name, image FROM plants WHERE id = ?', [id]);
          const plant = rows[0];
          if (!plant) {
            return res.status(404).json({ error: 'Plant not found' });
          }

          const plantName = plant.name;
          const plantsDir = path.join(__dirname, '../public/plants');

          try {
            const folders = fs.readdirSync(plantsDir);
            const matchedFolder = folders.find(f => {
              const cleanFolder = f.split('(')[0].trim().toLowerCase();
              const cleanPlantName = plantName.toLowerCase();
              // Support both "Peace Lily" matching "Peace Lily" and "Peace Lily" matching "PeaceLily"
              return cleanFolder === cleanPlantName || 
                     f.toLowerCase() === cleanPlantName ||
                     cleanFolder.replace(/\s+/g, '') === cleanPlantName.replace(/\s+/g, '');
            });

            if (matchedFolder) {
              const folderPath = path.join(plantsDir, matchedFolder);
              const files = fs.readdirSync(folderPath);
              const images = files
                .filter(file => /\.(jpe?g|png|webp|gif)$/i.test(file))
                .map(file => `/plants/${matchedFolder}/${file}`);
              
              if (images.length > 0) {
                return res.json(images);
              }
            }
          } catch (err) {
            console.error("Error reading plant images directory:", err);
          }

          // Fallback to the main image if folder search fails or returns no images
          res.json([plant.image]);
        } catch (error) {
          console.error("Error in images endpoint:", error);
          res.status(500).json({ error: 'Failed to fetch plant images' });
        }
      });

     app.post('/api/plants/:id/buy', async (req, res) => {
       try {
         const { id } = req.params;
         const { userId, quantity = 1 } = req.body;

         const [rows] = await db.execute('SELECT * FROM plants WHERE id = ?', [id]);
         const plant = rows[0];
         if (!plant) return res.status(404).json({ error: 'Plant not found' });
         
         // Logic Change: Never mark the original marketplace listing as sold.
         // Instead, always create new record(s) for the buyer.
         const insertQuery = 'INSERT INTO plants (name, type, price, location, image, space_tag, sunlight_need, min_temp, max_temp, purification_score, rule, scientific_name, nepali_name, english_name, description, is_sold, buyer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)';
         
         for (let i = 0; i < quantity; i++) {
           await db.execute(insertQuery, [
             plant.name, 
             plant.type, 
             plant.price, 
             plant.location, 
             plant.image, 
             plant.space_tag, 
             plant.sunlight_need, 
             plant.min_temp, 
             plant.max_temp, 
             plant.purification_score,
             plant.rule || '',
             plant.scientific_name || '',
             plant.nepali_name || '',
             plant.english_name || plant.name,
             plant.description || '',
             userId
           ]);
         }

         res.json({ message: `Success` });
       } catch (error) {
         console.error('Purchase error:', error);
         res.status(500).json({ error: 'Purchase failed' });
       }
     });

      app.post('/api/nursery/plants', async (req, res) => {
        try {
          const {
            name,
            category,
            price,
            description,
            image,
            available,
            nurseryExternalId,
            location,
          } = req.body;

          if (!name || !price || !nurseryExternalId) {
            return res.status(400).json({ error: 'Missing required nursery plant fields' });
          }

          const [nurseryRows] = await db.execute('SELECT * FROM nurseries WHERE external_id = ?', [nurseryExternalId]);
          let nursery = nurseryRows[0];
          if (!nursery) {
            // Create a simple nursery record for the external nursery if not already present
            await db.execute(
              'INSERT INTO nurseries (external_id, nursery_name, owner_name, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
              [nurseryExternalId, req.body.nurseryName || 'Partner Nursery', req.body.ownerName || '', req.body.email || '', req.body.phone || '', req.body.location || '']
            );
            const [newNurseryRows] = await db.execute('SELECT * FROM nurseries WHERE external_id = ?', [nurseryExternalId]);
            nursery = newNurseryRows[0];
          }

          const insertPlant = `INSERT INTO plants
            (name, type, price, location, image, space_tag, sunlight_need, min_temp, max_temp, purification_score, rule, scientific_name, nepali_name, english_name, description, available, nursery_id, nursery_name, nursery_external_id, nursery_location, nursery_phone, is_sold)
            VALUES (?, ?, ?, ?, ?, 'Any', '2', 10, 35, 5, '', '', '', '', ?, ?, ?, ?, ?, ?, ?, 0)`;
          const [result] = await db.execute(insertPlant, [
            name,
            category || 'plant',
            price,
            location || 'Partner Nursery',
            image || '/plants/default.jpg',
            description || '',
            available ? 1 : 0,
            nursery.id,
            nursery.nursery_name || 'Partner Nursery',
            nurseryExternalId,
            location || 'Partner Nursery',
            req.body.phone || '',
          ]);

          res.json({ success: true, plantId: result.insertId });
        } catch (error) {
          console.error('[NURSERY] Add plant error:', error);
          res.status(500).json({ error: 'Failed to add nursery plant' });
        }
      });

      app.put('/api/nursery/plants/:id', async (req, res) => {
        try {
          const { id } = req.params;
          const {
            name,
            category,
            price,
            description,
            image,
            available,
            location,
          } = req.body;

          const [rows] = await db.execute('SELECT * FROM plants WHERE id = ?', [id]);
          const plant = rows[0];
          if (!plant) return res.status(404).json({ error: 'Nursery plant not found' });

          await db.execute(
            `UPDATE plants SET
              name = ?,
              type = ?,
              price = ?,
              location = ?,
              image = ?,
              description = ?,
              available = ?
             WHERE id = ?`,
            [
              name || plant.name,
              category || plant.type,
              price || plant.price,
              location || plant.location,
              image || plant.image,
              description || plant.description,
              typeof available !== 'undefined' ? (available ? 1 : 0) : plant.available,
              id,
            ]
          );

          res.json({ success: true, plantId: Number(id) });
        } catch (error) {
          console.error('[NURSERY] Update plant error:', error);
          res.status(500).json({ error: 'Failed to update nursery plant' });
        }
      });

      app.patch('/api/nursery/plants/:id/availability', async (req, res) => {
        try {
          const { id } = req.params;
          const { available } = req.body;
          await db.execute('UPDATE plants SET available = ? WHERE id = ?', [available ? 1 : 0, id]);
          res.json({ success: true });
        } catch (error) {
          console.error('[NURSERY] Availability update error:', error);
          res.status(500).json({ error: 'Failed to update availability' });
        }
      });

      app.delete('/api/nursery/plants/:id', async (req, res) => {
        try {
          const { id } = req.params;
          await db.execute('DELETE FROM plants WHERE id = ?', [id]);
          res.json({ success: true });
        } catch (error) {
          console.error('[NURSERY] Delete plant error:', error);
          res.status(500).json({ error: 'Failed to delete nursery plant' });
        }
      });

      app.get('/api/nursery/profile/:externalId', async (req, res) => {
        try {
          const { externalId } = req.params;
          const [rows] = await db.execute('SELECT * FROM nurseries WHERE external_id = ?', [externalId]);
          if (rows.length === 0) return res.status(404).json({ error: 'Nursery not found' });
          res.json(rows[0]);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch nursery profile' });
        }
      });

      app.get('/api/nursery/plants/:externalId', async (req, res) => {
        try {
          const { externalId } = req.params;
          const [rows] = await db.execute('SELECT * FROM plants WHERE nursery_external_id = ?', [externalId]);
          res.json(rows);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch nursery plants' });
        }
      });

      app.get('/api/nursery/stats/:externalId', async (req, res) => {
        try {
          const { externalId } = req.params;
          const [nurseryRows] = await db.execute('SELECT id FROM nurseries WHERE external_id = ?', [externalId]);
          if (nurseryRows.length === 0) return res.status(404).json({ error: 'Nursery not found' });
          
          const [productRows] = await db.execute('SELECT COUNT(*) as count FROM plants WHERE nursery_external_id = ?', [externalId]);
          const [orderRows] = await db.execute('SELECT COUNT(*) as count FROM trade_requests WHERE receiver_id = ? AND request_type = "buy"', [nurseryRows[0].id]);
          // Simplified stats for now
          res.json({
            totalProducts: productRows[0].count,
            totalOrders: orderRows[0].count,
            totalPlantsSold: 0, 
            totalRevenue: 0,
            lowStock: 0,
            recentOrders: [],
            trending: []
          });
        } catch (error) {
          console.error('[NURSERY] Stats error:', error);
          res.status(500).json({ error: 'Failed to fetch nursery stats' });
        }
      });

      app.get('/api/nursery/orders/:externalId', async (req, res) => {
        try {
          const { externalId } = req.params;
          const [nurseryRows] = await db.execute('SELECT id FROM nurseries WHERE external_id = ?', [externalId]);
          if (nurseryRows.length === 0) return res.status(404).json({ error: 'Nursery not found' });
          
          const [rows] = await db.execute(`
            SELECT tr.*, p.name as plantName, u.full_name as customerName 
            FROM trade_requests tr
            JOIN plants p ON tr.plant_id = p.id
            JOIN users u ON tr.sender_id = u.id
            WHERE tr.receiver_id = ? AND tr.request_type = 'buy'
            ORDER BY tr.created_at DESC
          `, [nurseryRows[0].id]);
          
          const formattedOrders = rows.map(o => ({
            id: o.id,
            plantName: o.plantName,
            quantity: 1, // Assume 1 for now or add quantity to trade_requests
            orderDate: new Date(o.created_at).toISOString().split('T')[0],
            customerName: o.customerName,
            totalAmount: o.offer_details ? parseInt(o.offer_details.replace(/[^0-9]/g, '')) || 0 : 450,
            status: o.status === 'approved' ? 'Completed' : (o.status === 'rejected' ? 'Cancelled' : 'Processing')
          }));

          res.json(formattedOrders);
        } catch (error) {
          console.error('[NURSERY] Orders error:', error);
          res.status(500).json({ error: 'Failed to fetch nursery orders' });
        }
      });

     app.post('/api/payment/complete/:sessionId', async (req, res) => {
       try {
         await ensurePaymentSessionsTable();
         const { sessionId } = req.params;
         console.log(`[PAYMENT] Attempting to complete session: ${sessionId}`);
         
         // 1. Fetch session details
         const [sessionRows] = await db.execute('SELECT * FROM payment_sessions WHERE id = ?', [sessionId]);
         const session = sessionRows[0];
         
         if (!session) {
           console.error(`[PAYMENT] Session not found: ${sessionId}`);
           return res.status(404).json({ error: 'Session not found' });
         }

         if (session.status === 'completed') {
           console.log(`[PAYMENT] Session ${sessionId} already completed.`);
           return res.json({ success: true, message: 'Already completed' });
         }

         const cartItems = JSON.parse(session.cart_items || '[]');
         const userId = session.user_id || 1;
         console.log(`[PAYMENT] Processing ${cartItems.length} items for User ID: ${userId}`);

         const errors = [];

         // 2. Process each item in the cart
         for (const item of cartItems) {
           try {
             const rawId = item.id ? item.id.toString() : '';
             console.log(`[PAYMENT] Processing item: ${item.name} (ID: ${rawId}, Qty: ${item.quantity})`);

             // Special case for "Specialized Care Tips" unlock
             if (rawId.startsWith('UNLOCK-TIPS-')) {
                const actualPlantId = rawId.replace('UNLOCK-TIPS-', '');
                await db.execute('UPDATE plants SET tips_unlocked = 1 WHERE id = ?', [actualPlantId]);
                console.log(`[PAYMENT] Unlocked specialized tips for plant ID: ${actualPlantId}`);
                continue;
             }

             const quantity = item.quantity || 1;

             // Logic: 
             // 1. If it's a numeric ID, try to find the EXACT unsold plant.
             // 2. If it's a MATCHED- or SCAN-TEMP- or not found, create new record(s).

             let plantTemplate = null;
             const isNumericId = /^\d+$/.test(rawId);

             if (isNumericId) {
                const [availableRows] = await db.execute('SELECT * FROM plants WHERE id = ? AND is_sold = 0', [rawId]);
                plantTemplate = availableRows[0];
             }

             if (plantTemplate) {
                // Logic Change: Never mark the original marketplace listing as sold.
                // Instead, always create new record(s) for the buyer using the template.
                console.log(`[PAYMENT] Using existing plant ID ${rawId} as template for User ${userId}`);
                
                const insertQuery = `INSERT INTO plants 
                  (name, type, price, location, image, space_tag, sunlight_need, min_temp, max_temp, purification_score, rule, scientific_name, nepali_name, english_name, description, is_sold, buyer_id) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`;
                
                for (let i = 0; i < quantity; i++) {
                  await db.execute(insertQuery, [
                    plantTemplate.name, plantTemplate.type, plantTemplate.price, plantTemplate.location, plantTemplate.image, 
                    plantTemplate.space_tag, plantTemplate.sunlight_need, plantTemplate.min_temp, plantTemplate.max_temp, 
                    plantTemplate.purification_score, plantTemplate.rule || '', plantTemplate.scientific_name || '', 
                    plantTemplate.nepali_name || '', plantTemplate.english_name || plantTemplate.name, plantTemplate.description || '', userId
                  ]);
                }
                console.log(`[PAYMENT] Created ${quantity} record(s) for User ${userId} based on template ID ${rawId}`);
             } else {
                // Exact plant not available or ID is a scan identifier
                console.log(`[PAYMENT] No unsold plant with ID ${rawId}. Finding template by name: "${item.name}"`);
                
                const [templateRows] = await db.execute('SELECT * FROM plants WHERE LOWER(name) = ? LIMIT 1', [item.name.toLowerCase()]);
                const fallbackTemplate = templateRows[0];

                const insertQuery = `INSERT INTO plants 
                  (name, type, price, location, image, space_tag, sunlight_need, min_temp, max_temp, purification_score, rule, scientific_name, nepali_name, english_name, description, is_sold, buyer_id) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`;

                for (let i = 0; i < quantity; i++) {
                  await db.execute(insertQuery, [
                    item.name || fallbackTemplate?.name || 'Unknown Plant',
                    item.type || fallbackTemplate?.type || 'buy',
                    item.price || fallbackTemplate?.price || 'Rs. 450',
                    item.location || fallbackTemplate?.location || 'Partner Nursery',
                    item.image || fallbackTemplate?.image || '/plants/default.jpg',
                    item.space_tag || fallbackTemplate?.space_tag || 'indoor',
                    item.sunlight_need || fallbackTemplate?.sunlight_need || '2',
                    item.min_temp || fallbackTemplate?.min_temp || 15,
                    item.max_temp || fallbackTemplate?.max_temp || 30,
                    item.purification_score || fallbackTemplate?.purification_score || 5,
                    item.rule || fallbackTemplate?.rule || '',
                    item.scientific_name || fallbackTemplate?.scientific_name || '',
                    item.nepali_name || fallbackTemplate?.nepali_name || '',
                    item.english_name || fallbackTemplate?.english_name || item.name || 'Unknown Plant',
                    item.description || fallbackTemplate?.description || '',
                    userId
                  ]);
                }
                console.log(`[PAYMENT] Created ${quantity} new plant record(s) for User ${userId} (Name: ${item.name})`);
             }
           } catch (itemError) {
             console.error(`[PAYMENT] Item processing error for ${item.name}:`, itemError.message);
             errors.push(`${item.name}: ${itemError.message}`);
           }
         }

         // 3. Update session status
         await db.execute('UPDATE payment_sessions SET status = ? WHERE id = ?', ['completed', sessionId]);
         console.log(`[PAYMENT] Session ${sessionId} marked as completed for User ${userId}`);

         res.json({ success: errors.length === 0, processedItems: cartItems.length, errors: errors.length > 0 ? errors : undefined });
         } catch (error) {
         console.error('[PAYMENT] Critical error completing payment:', error);
         res.status(500).json({ error: 'Failed to complete payment', details: error.message });
       }
     });

     app.post('/api/plants/:id/unlock-tips-demo', async (req, res) => {
        try {
            const { id } = req.params;
            await db.execute('UPDATE plants SET tips_unlocked = 1 WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to unlock tips' });
        }
     });

     // --- Dashboard Endpoints ---
     app.get('/api/user/:userId/collection', async (req, res) => {
       try {
         const { userId } = req.params;
         console.log(`[DASHBOARD] Fetching collection for User ID: ${userId}`);
         const [plants] = await db.execute('SELECT * FROM plants WHERE buyer_id = ?', [userId]);
         console.log(`[DASHBOARD] Found ${plants.length} plants for User ID: ${userId}`);
         res.json(plants);
       } catch (error) {
         console.error('[DASHBOARD] Error fetching collection:', error);
         res.status(500).json({ error: 'Failed to fetch collection' });
       }
     });

     app.get('/api/user/:userId/stats', async (req, res) => {
       try {
         const { userId } = req.params;
         console.log(`[DASHBOARD] Fetching stats for User ID: ${userId}`);
         const [rows] = await db.execute('SELECT COUNT(*) as ownedCount FROM plants WHERE buyer_id = ?', [userId]);
         const [co2Rows] = await db.execute('SELECT SUM(purification_score) as totalCO2 FROM plants WHERE buyer_id = ?', [userId]);
         
         const stats = {
           ownedCount: rows[0].ownedCount || 0,
           totalCO2: (co2Rows[0].totalCO2 * 0.1).toFixed(1) || "0.0"
         };
         console.log(`[DASHBOARD] Stats for User ${userId}:`, stats);
         res.json(stats);
       } catch (error) {
         console.error('[DASHBOARD] Error fetching stats:', error);
         res.status(500).json({ error: 'Failed to fetch stats' });
       }
      });

       // --- Payment Endpoints ---

       // 1. Initiate payment session
       app.post('/api/payment/initiate', async (req, res) => {
         try {
           await ensurePaymentSessionsTable();
           const { cartItems, userId, amount } = req.body;
           const sessionId = 'PAY-' + Date.now() + '-' + Math.round(Math.random() * 1000);
           
           await db.execute(
             "INSERT INTO payment_sessions (id, user_id, cart_items, total_amount, status) VALUES (?, ?, ?, ?, 'pending')",
             [sessionId, userId || 1, JSON.stringify(cartItems || []), amount || 0]
           );

           res.json({ sessionId, status: 'pending' });
         } catch (error) {
           console.error('[PAYMENT] Initiate error:', error);
           res.status(500).json({ error: 'Failed to initiate payment session', details: error.message });
         }
       });

       // 2. Check payment status
       app.get('/api/payment/status/:sessionId', async (req, res) => {
         try {
           const { sessionId } = req.params;
           const [rows] = await db.execute('SELECT * FROM payment_sessions WHERE id = ?', [sessionId]);
           if (rows.length === 0) {
             return res.status(404).json({ error: 'Payment session not found' });
           }
           res.json({ status: rows[0].status });
         } catch (error) {
           res.status(500).json({ error: 'Failed to fetch payment status' });
         }
       });

       // 3. Get bill details for mobile payment view
       app.get('/api/payment/bill/:sessionId', async (req, res) => {
         try {
           const { sessionId } = req.params;
           const [rows] = await db.execute('SELECT * FROM payment_sessions WHERE id = ?', [sessionId]);
           if (rows.length === 0) {
             return res.status(404).json({ error: 'Bill not found' });
           }
           const session = rows[0];
           try {
             session.cart_items = typeof session.cart_items === 'string' ? JSON.parse(session.cart_items) : (session.cart_items || []);
           } catch (e) {
             session.cart_items = [];
           }
           res.json(session);
         } catch (error) {
           res.status(500).json({ error: 'Failed to fetch bill' });
         }
       });

      // --- P2P / Community Endpoints ---

      // List a plant in the community marketplace
      app.post('/api/marketplace/list', async (req, res) => {
        try {
          const { plantId, userId, listingType, price } = req.body;
          
          const [result] = await db.execute(
            'UPDATE plants SET is_listed = 1, listing_type = ?, seller_id = ?, original_price = ? WHERE id = ? AND buyer_id = ?',
            [listingType, userId, price, plantId, userId]
          );

          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Plant not found or not owned by user' });
          }

          res.json({ success: true, message: 'Plant listed successfully' });
        } catch (error) {
          console.error('[COMMUNITY] Listing error:', error);
          res.status(500).json({ error: 'Failed to list plant' });
        }
      });

      // Add a COMPLETELY NEW product to the community marketplace
      app.post('/api/marketplace/add', uploadPlant.single('image'), async (req, res) => {
        try {
          const { name, type, price, location, listingType, sellerId, description } = req.body;
          const imagePath = req.file ? `/uploads/plants/${req.file.filename}` : '/plants/default.jpg';

          const [result] = await db.execute(
            `INSERT INTO plants 
             (name, type, price, location, image, is_listed, listing_type, seller_id, original_price, description, space_tag, sunlight_need) 
             VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'Any', '2')`,
            [name, type || 'plant', price, location || 'Kathmandu', imagePath, listingType, sellerId, price, description || '']
          );

          res.json({ success: true, message: 'Product added to marketplace', plantId: result.insertId });
        } catch (error) {
          console.error('[COMMUNITY] Add product error:', error);
          res.status(500).json({ error: 'Failed to add product' });
        }
      });

      // Fetch community listings (not owned by current user)
      app.get('/api/marketplace/community', async (req, res) => {
        try {
          const { userId } = req.query;
          const [listings] = await db.execute(`
            SELECT p.*, u.full_name as seller_name, u.preferred_location as seller_location, u.profile_image as seller_avatar
            FROM plants p
            JOIN users u ON p.seller_id = u.id
            WHERE p.is_listed = 1
          `, []);
          res.json(listings);
        } catch (error) {
          console.error('[COMMUNITY] Fetch listings error:', error);
          res.status(500).json({ error: 'Failed to fetch community listings' });
        }
      });

      // Delete (unlist) a community listing — only the owner can do this
      app.delete('/api/marketplace/listing/:plantId', async (req, res) => {
        try {
          const { plantId } = req.params;
          const { userId } = req.body;
          const [rows] = await db.execute(
            'SELECT id FROM plants WHERE id = ? AND seller_id = ? AND is_listed = 1',
            [plantId, userId]
          );
          if (rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized or listing not found' });
          }
          await db.execute('UPDATE plants SET is_listed = 0 WHERE id = ?', [plantId]);
          res.json({ success: true });
        } catch (error) {
          console.error('[COMMUNITY] Delete listing error:', error);
          res.status(500).json({ error: 'Failed to delete listing' });
        }
      });

      // Send a trade/buy request
      app.post('/api/trade/request', async (req, res) => {
        try {
          await ensureTradeRequestsTable();
          const { senderId, receiverId, plantId, requestType, offerDetails } = req.body;
          if (!senderId || !plantId) {
            return res.status(400).json({ error: 'Sender ID and Plant ID are required' });
          }
          
          const sId = String(senderId);
          const rId = receiverId ? String(receiverId) : null;
          const pId = String(plantId);

          // Check if already requested
          const [existing] = await db.execute(
            "SELECT id FROM trade_requests WHERE sender_id = ? AND plant_id = ? AND status = 'pending'",
            [sId, pId]
          );
          if (existing.length > 0) {
            return res.status(400).json({ error: 'Request already pending' });
          }

          await db.execute(
            'INSERT INTO trade_requests (sender_id, receiver_id, plant_id, request_type, offer_details) VALUES (?, ?, ?, ?, ?)',
            [sId, rId, pId, requestType || 'buy', offerDetails || '']
          );

          res.json({ success: true, message: 'Request sent successfully' });
        } catch (error) {
          console.error('[TRADE] Request error:', error);
          res.status(500).json({ error: 'Failed to send request', details: error.message });
        }
      });

      // Fetch requests for a user (both incoming and outgoing)
      app.get('/api/trade/requests/:userId', async (req, res) => {
        try {
          await ensureTradeRequestsTable();
          const { userId } = req.params;
          
          const [incoming] = await db.execute(`
            SELECT r.*, p.name as plant_name, p.image as plant_image, u.full_name as sender_name
            FROM trade_requests r
            JOIN plants p ON r.plant_id = p.id
            LEFT JOIN users u ON r.sender_id = u.id
            WHERE r.receiver_id = ?
            ORDER BY r.created_at DESC
          `, [userId]);

          const [outgoing] = await db.execute(`
            SELECT r.*, p.name as plant_name, p.image as plant_image, u.full_name as receiver_name
            FROM trade_requests r
            JOIN plants p ON r.plant_id = p.id
            LEFT JOIN users u ON r.receiver_id = u.id
            WHERE r.sender_id = ?
            ORDER BY r.created_at DESC
          `, [userId]);

          res.json({ incoming, outgoing });
        } catch (error) {
          console.error('[TRADE] Fetch requests error:', error);
          res.status(500).json({ error: 'Failed to fetch requests' });
        }
      });

      // Get trade notification count
      app.get('/api/trade/notifications/count/:userId', async (req, res) => {
        try {
          const { userId } = req.params;
          if (!userId) return res.json({ count: 0 });
          const [incoming] = await db.execute(
            "SELECT COUNT(*) as count FROM trade_requests WHERE receiver_id = ? AND receiver_seen = 0 AND status = 'pending'",
            [String(userId)]
          );
          const [outgoing] = await db.execute(
            "SELECT COUNT(*) as count FROM trade_requests WHERE sender_id = ? AND sender_seen = 0 AND status IN ('accepted', 'rejected')",
            [String(userId)]
          );
          const total = (incoming[0]?.count || 0) + (outgoing[0]?.count || 0);
          res.json({ count: total });
        } catch (error) {
          console.error('[TRADE] Notifications count error:', error);
          res.json({ count: 0 });
        }
      });

      // Mark trade notifications as seen
      app.post('/api/trade/notifications/clear/:userId', async (req, res) => {
        try {
          const { userId } = req.params;
          // When looking at community/requests, mark all relevant as seen
          await db.execute('UPDATE trade_requests SET receiver_seen = 1 WHERE receiver_id = ?', [userId]);
          await db.execute("UPDATE trade_requests SET sender_seen = 1 WHERE sender_id = ? AND status IN ('accepted', 'rejected')", [userId]);
          res.json({ success: true });
        } catch (error) {
          res.status(500).json({ error: 'Failed to clear notifications' });
        }
      });

      // Respond to a request (Accept/Reject)
      app.post('/api/trade/respond', async (req, res) => {
        try {
          const { requestId, status, userId } = req.body; // status: 'accepted', 'rejected'
          
          const [requestRows] = await db.execute('SELECT * FROM trade_requests WHERE id = ?', [requestId]);
          const request = requestRows[0];
          
          if (!request) return res.status(404).json({ error: 'Request not found' });
          if (request.receiver_id != userId) return res.status(403).json({ error: 'Unauthorized' });

          await db.execute('UPDATE trade_requests SET status = ?, sender_seen = 0 WHERE id = ?', [status, requestId]);

          if (status === 'accepted') {
            // Transfer ownership
            await db.execute(
              'UPDATE plants SET buyer_id = ?, seller_id = NULL, is_listed = 0, is_sold = 1 WHERE id = ?',
              [request.sender_id, request.plant_id]
            );
            
            // Reject all other pending requests for this plant
            await db.execute(
              "UPDATE trade_requests SET status = 'rejected' WHERE plant_id = ? AND status = 'pending' AND id != ?",
              [request.plant_id, requestId]
            );
          }

          res.json({ success: true, message: `Request ${status}` });
        } catch (error) {
          console.error('[TRADE] Response error:', error);
          res.status(500).json({ error: 'Failed to update request' });
        }
      });

      // Fetch all users (Community discovery)
      app.get('/api/community/users', async (req, res) => {
        try {
          const { currentUserId } = req.query;
          const [users] = await db.execute(`
            SELECT id, full_name, profile_image, preferred_location, 
            (SELECT COUNT(*) FROM plants WHERE seller_id = users.id AND is_listed = 1) as listing_count
            FROM users 
            WHERE id != ?
            ORDER BY listing_count DESC
          `, [currentUserId || 0]);
          res.json(users);
        } catch (error) {
          console.error('[COMMUNITY] Fetch users error:', error);
          res.status(500).json({ error: 'Failed to fetch users' });
        }
      });

      // --- Identification Endpoint ---
     app.post('/api/identify', upload.single('image'), async (req, res) => {
       console.log('[IDENTIFY] Identification request received.');
       try {
         if (!req.file) {
           console.error('[IDENTIFY] No file in request.');
           return res.status(400).json({ error: 'No image uploaded' });
         }

         const API_KEY = process.env.PLANTNET_API_KEY || '2b10EyS9kfkdkzj40wPpe7cnf';
         const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${API_KEY}`;

         console.log(`[IDENTIFY] Processing image: ${req.file.originalname} (${req.file.size} bytes)`);

         const form = new FormData();
         form.append('images', req.file.buffer, { filename: 'image.jpg', contentType: req.file.mimetype });
         form.append('organs', 'leaf');

         console.log('[IDENTIFY] Sending image to Pl@ntNet API...');
         const response = await fetch(url, {
           method: 'POST',
           body: form,
           headers: form.getHeaders()
         });

         if (!response.ok) {
           const errStatus = response.status;
           const errText = await response.text();
           console.error(`[IDENTIFY] Pl@ntNet API error (${errStatus}):`, errText);
           
           if (errStatus === 404) return res.status(404).json({ error: 'Species not found in AI database.' });
           if (errStatus === 401) return res.status(401).json({ error: 'Invalid API Key. Please check Backend configuration.' });
           if (errStatus === 429) return res.status(429).json({ error: 'AI limit reached. Please try again later.' });
           
           return res.status(response.status).json({ error: `AI Identification failed (${errStatus})` });
         }

         const data = await response.json();
         const bestMatch = data.results && data.results[0];
         
         if (!bestMatch) {
           console.log('[IDENTIFY] No matches found by Pl@ntNet.');
           return res.json({ found: false });
         }

         // Match with local database
         const scientificName = bestMatch.species.scientificNameWithoutAuthor;
         const commonName = (bestMatch.species.commonNames && bestMatch.species.commonNames[0]) || '';

         console.log(`[IDENTIFY] Best match: ${scientificName} (${commonName}) | Score: ${bestMatch.score}`);

         // Try to find in our DB by scientific name or common name
         // Use more specific match logic
         let localPlant = null;
         try {
            const [rows] = await db.execute(
              'SELECT * FROM plants WHERE (LOWER(scientific_name) = ? OR LOWER(name) = ? OR LOWER(name) LIKE ?) AND is_sold = 0 LIMIT 1',
              [scientificName.toLowerCase(), commonName.toLowerCase(), `%${scientificName.split(' ')[0].toLowerCase()}%`]
            );
            localPlant = rows[0] || null;
         } catch (dbErr) {
            console.error('[IDENTIFY] Database search error:', dbErr.message);
         }

         res.json({
           found: true,
           score: bestMatch.score,
           scientificName: scientificName,
           commonName: commonName,
           localPlant: localPlant,
           allMatches: data.results.slice(0, 3).map(r => ({
             name: (r.species.commonNames && r.species.commonNames[0]) || r.species.scientificNameWithoutAuthor,
             score: r.score
           }))
         });

       } catch (error) {
         console.error('[IDENTIFY] Critical error:', error);
         res.status(500).json({ error: 'Internal server error during identification' });
       }
     });

     // Basic Route
     app.get('/', (req, res) => {      res.send('Leaf-Life API is running...');
    });

      // --- Admin Dashboard Endpoints ---
      app.get('/api/admin/stats', async (req, res) => {
        try {
          const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
          const [nurseryCount] = await db.execute('SELECT COUNT(*) as count FROM nurseries');
          const [plantCount] = await db.execute('SELECT COUNT(*) as count FROM plants');
          const [orderCount] = await db.execute('SELECT COUNT(*) as count FROM trade_requests WHERE request_type = "buy"');
           const [revenue] = await db.execute("SELECT SUM(total_amount) as total FROM payment_sessions WHERE status = 'completed'");
          
          res.json({
            totalUsers: userCount[0].count,
            totalNurseries: nurseryCount[0].count,
            totalPlants: plantCount[0].count,
            totalOrders: orderCount[0].count,
            totalRevenue: revenue[0].total || 0,
            pendingNurseries: 0 // Logic for pending nurseries can be added if needed
          });
        } catch (error) {
          console.error('[ADMIN] Stats error:', error);
          res.status(500).json({ error: 'Failed to fetch admin stats' });
        }
      });

      app.get('/api/admin/users', async (req, res) => {
        try {
          const [rows] = await db.execute('SELECT id, full_name, email, role, created_at FROM users');
          res.json(rows);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch users' });
        }
      });

      app.get('/api/admin/nurseries', async (req, res) => {
        try {
          const [rows] = await db.execute('SELECT * FROM nurseries');
          res.json(rows);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch nurseries' });
        }
      });

      app.get('/api/admin/orders', async (req, res) => {
        try {
          const [rows] = await db.execute(`
            SELECT tr.*, p.name as plantName, u.full_name as customerName, n.nursery_name 
            FROM trade_requests tr
            JOIN plants p ON tr.plant_id = p.id
            JOIN users u ON tr.sender_id = u.id
            LEFT JOIN nurseries n ON tr.receiver_id = n.id
            ORDER BY tr.created_at DESC
          `);
          res.json(rows);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch orders' });
        }
      });

      app.get('/api/admin/plants', async (req, res) => {
        try {
          const [rows] = await db.execute('SELECT * FROM plants ORDER BY created_at DESC');
          res.json(rows);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch plants' });
        }
      });

    app.get('/api/network-info', (req, res) => {
      const interfaces = require('os').networkInterfaces();
      let ip = 'localhost';
      
      // Preferred interface patterns
      const preferred = ['wi-fi', 'ethernet', 'wlan', 'en0', 'eth0'];
      
      let found = false;
      // First pass: try to find a preferred physical adapter
      for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();
        if (preferred.some(p => lowerName.includes(p)) && !lowerName.includes('virtual') && !lowerName.includes('veth')) {
          for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
              ip = iface.address;
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      
      // Second pass: if no preferred found, take any non-internal IPv4
      if (!found) {
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
              ip = iface.address;
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      
      res.json({ ip });
    });
   
    app.listen(PORT, '0.0.0.0', () => {
      console.log(` Leaf-Life API is running!`);
      console.log(` Local:   http://localhost:${PORT}`);
      console.log(` Network: http://${require('os').networkInterfaces()['Wi-Fi']?.[1]?.address || 'your-ip-address'}:${PORT}`);
      console.log(` Mobile Hint: Ensure Windows Firewall allows traffic on Port ${PORT}`);
    });