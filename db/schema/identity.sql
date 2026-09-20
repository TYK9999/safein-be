-- ---------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------

CREATE TABLE app_user (
    id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email              text        NOT NULL UNIQUE,
    first_name         text,
    last_name          text,
    phone              text,                          -- invite form; E.164-ish, optional
    email_verified_at  timestamptz,
    -- invited until first successful OTP (sign-up or invite); then active.
    account_status     text        NOT NULL DEFAULT 'invited'  -- invited | active | suspended
                       CHECK (account_status IN ('invited', 'active', 'suspended')),
    is_platform_admin  boolean     NOT NULL DEFAULT false,  -- SafeIn5 admin (all tenants)
    last_signed_in_at  timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    created_by         integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by         integer     REFERENCES app_user (id) ON DELETE SET NULL
);

CREATE TABLE auth_token (
    id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  -- otp = email one-time code for sign-up and sign-in (no magic links)
    kind           text        NOT NULL CHECK (kind IN ('otp')),
    token_hash     text        NOT NULL,
    expires_at     timestamptz NOT NULL,
    consumed_at    timestamptz,
    attempt_count  integer     NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    created_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by     integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_auth_token_user_id    ON auth_token (user_id);
CREATE INDEX idx_auth_token_token_hash ON auth_token (token_hash);
