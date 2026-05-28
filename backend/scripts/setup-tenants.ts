/**
 * Setup script for multi-tenant databases.
 * Creates databases for each tenant and pushes the Prisma schema.
 *
 * Usage: npx ts-node scripts/setup-tenants.ts
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const tenants = [
  { name: 'Scoopmandu', envKey: 'DATABASE_URL_SCOOPMANDU', dbName: 'scoopmandu_db' },
  { name: 'RKT Tradings', envKey: 'DATABASE_URL_RKT', dbName: 'rkt_tradings_db' },
];

async function main() {
  console.log('🏗️  Setting up tenant databases...\n');

  for (const tenant of tenants) {
    const url = process.env[tenant.envKey];
    if (!url) {
      console.error(`❌ ${tenant.name}: Missing ${tenant.envKey} in .env`);
      continue;
    }

    console.log(`📦 ${tenant.name} (${tenant.dbName})`);
    console.log(`   URL: ${url.replace(/:[^:@]+@/, ':***@')}`); // mask password

    try {
      // Push schema to this tenant's database
      execSync(`npx prisma db push`, {
        env: { ...process.env, DATABASE_URL: url },
        stdio: 'pipe',
      });
      console.log(`   ✅ Schema pushed successfully`);
    } catch (err: any) {
      const output = err.stderr?.toString() || err.message;
      if (output.includes('does not exist')) {
        console.log(`   ⚠️  Database "${tenant.dbName}" does not exist. Create it first:`);
        console.log(`      CREATE DATABASE ${tenant.dbName};`);
      } else {
        console.error(`   ❌ Failed: ${output.slice(0, 200)}`);
      }
    }

    console.log('');
  }

  console.log('─────────────────────────────────────────────');
  console.log('To seed a specific tenant database:');
  console.log('  DATABASE_URL="<tenant_url>" npx prisma db seed');
  console.log('');
}

main();
