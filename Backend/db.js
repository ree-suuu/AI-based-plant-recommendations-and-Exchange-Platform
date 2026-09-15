const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        host: '/var/run/postgresql',
        user: process.env.USER || 'postgres',
        database: 'leaflife'
    };

const pool = new Pool({ ...poolConfig, max: 10 });

function replacePlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

function addReturningId(sql) {
    if (/^\s*INSERT\s/i.test(sql) && !/\bRETURNING\b/i.test(sql)) {
        return `${sql.trimEnd()} RETURNING id`;
    }
    return sql;
}

async function execute(sql, params = []) {
    const query = addReturningId(replacePlaceholders(sql));
    const result = await pool.query(query, params);
    const isRead = /^\s*(SELECT|WITH)\b/i.test(sql);

    if (isRead) return [result.rows, result.fields];

    return [{
        affectedRows: result.rowCount,
        insertId: result.rows[0]?.id,
        rows: result.rows
    }, result.fields];
}

module.exports = { execute, query: (text, values) => pool.query(text, values), pool };