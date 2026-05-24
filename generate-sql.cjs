const fs = require('fs');
const path = require('path');

const migrationsDir = 'd:/Project-Pribadi/N8N-Test-Project/Form/database/migrations/table-sql';
const outputFile = 'd:/Project-Pribadi/N8N-Test-Project/Template-Kasir-POS-Pro/database/INSTALL_DATABASE.sql';
const outputFileLocal = 'd:/Project-Pribadi/N8N-Test-Project/Form/database/INSTALL_DATABASE.sql';

const file00 = fs.readFileSync(path.join(migrationsDir, '00-COMPLETE-DATABASE-SETUP.sql'), 'utf8');
const file10 = fs.readFileSync(path.join(migrationsDir, '10-CREATE-TRANSAKSI-FRESH.sql'), 'utf8');
const file11 = fs.readFileSync(path.join(migrationsDir, '11-CREATE-PENGATURAN-RAHASIA.sql'), 'utf8');
const file12 = fs.readFileSync(path.join(migrationsDir, '12-CREATE-PENGATURAN.sql'), 'utf8');
const file13 = fs.readFileSync(path.join(migrationsDir, '13-CREATE-PELANGGAN.sql'), 'utf8');

// Extract all from 00 EXCEPT the transaksi table creation
// We will replace the CREATE TABLE IF NOT EXISTS transaksi ... block.

let new00 = file00;

// The transaksi table in 00 is from "CREATE TABLE IF NOT EXISTS transaksi (" to "COMMENT ON COLUMN transaksi.metode_pembayaran IS 'Metode: tunai, qr (QRIS), atau transfer';"
const transaksiStart = new00.indexOf('CREATE TABLE IF NOT EXISTS transaksi (');
const nextTableStart = new00.indexOf('-- 2.5 TABEL: bank_account');

if (transaksiStart !== -1 && nextTableStart !== -1) {
  const beforeTransaksi = new00.substring(0, transaksiStart);
  const afterTransaksi = new00.substring(nextTableStart);
  
  new00 = beforeTransaksi + '\n\n' + file10 + '\n\n' + afterTransaksi;
}

new00 = new00 + '\n\n' + file12 + '\n\n-- ============================================\n-- TABEL: PENGATURAN RAHASIA\n-- ============================================\n\n' + file11 + '\n\n' + file13;

fs.writeFileSync(outputFile, new00);
fs.writeFileSync(outputFileLocal, new00);
console.log('Successfully generated clean INSTALL_DATABASE.sql');
