-- Digital Banking System schema
-- Run via: npm run migrate

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  dob             DATE NOT NULL,
  kyc_type        VARCHAR(3) NOT NULL CHECK (kyc_type IN ('bvn', 'nin')),
  kyc_id          VARCHAR(11) NOT NULL UNIQUE,
  kyc_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- customer_id UNIQUE enforces "maximum of 1 account per customer"
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  account_number  VARCHAR(10) NOT NULL UNIQUE,
  bank_code       VARCHAR(10) NOT NULL,
  bank_name       VARCHAR(150) NOT NULL,
  balance         NUMERIC(18,2) NOT NULL DEFAULT 0, -- local cache of the NIBSS ledger balance
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id        VARCHAR(64) NOT NULL UNIQUE, -- TSQ id returned by NIBSS (e.g. TX...)
  initiator_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  from_account          VARCHAR(10) NOT NULL,
  to_account            VARCHAR(10) NOT NULL,
  amount                NUMERIC(18,2) NOT NULL,
  direction             VARCHAR(5) NOT NULL CHECK (direction IN ('INTRA', 'INTER')),
  status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  raw_response          JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_from_account ON transactions(from_account);
CREATE INDEX IF NOT EXISTS idx_tx_to_account ON transactions(to_account);
CREATE INDEX IF NOT EXISTS idx_tx_initiator ON transactions(initiator_customer_id);
