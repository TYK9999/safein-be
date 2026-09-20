-- ---------------------------------------------------------------------
-- Hazard taxonomy (Echo category). Seeded to match the prototype's 12.
-- ---------------------------------------------------------------------

CREATE TABLE hazard_category (
    id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         text        NOT NULL,
    energy_band  text        NOT NULL CHECK (energy_band IN ('high_energy', 'standard')),
    sort_order   integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    created_by   integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by   integer     REFERENCES app_user (id) ON DELETE SET NULL
);

INSERT INTO hazard_category (name, energy_band, sort_order) VALUES
    ('Working at height',                    'high_energy', 10),
    ('Confined space',                       'high_energy', 20),
    ('Mobile plant and vehicles',            'high_energy', 30),
    ('Lifting operations',                   'high_energy', 40),
    ('Electrical / energy isolation',        'high_energy', 50),
    ('Mechanical / moving machinery',        'high_energy', 60),
    ('Slips, trips and falls',               'standard',    70),
    ('Manual handling',                      'standard',    80),
    ('Housekeeping / environment',           'standard',    90),
    ('PPE and equipment',                    'standard',   100),
    ('Tools and machinery condition',        'standard',   110),
    ('Environmental / weather',              'standard',   120);

-- Optional site rule: who owns a category at a site (Assign to suggestion).
CREATE TABLE site_category_owner (
    id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id            integer     NOT NULL REFERENCES site (id) ON DELETE CASCADE,
    hazard_category_id integer     NOT NULL REFERENCES hazard_category (id),
    owner_user_id      integer     NOT NULL REFERENCES app_user (id),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    created_by         integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by         integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (site_id, hazard_category_id)
);
