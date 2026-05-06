CREATE TABLE hospitals (
  id VARCHAR(64) PRIMARY KEY,
  region VARCHAR(16) NOT NULL,
  name VARCHAR(160) NOT NULL,
  branch VARCHAR(80) NOT NULL,
  level VARCHAR(40) NOT NULL DEFAULT 'medical_center',
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  source_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
  id VARCHAR(64) PRIMARY KEY,
  hospital_id VARCHAR(64) NOT NULL REFERENCES hospitals(id),
  name VARCHAR(80) NOT NULL,
  department VARCHAR(80) NOT NULL,
  specialty TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
  id VARCHAR(96) PRIMARY KEY,
  hospital_id VARCHAR(64) NOT NULL REFERENCES hospitals(id),
  doctor_id VARCHAR(64) NOT NULL REFERENCES doctors(id),
  clinic_date DATE NOT NULL,
  weekday SMALLINT NOT NULL,
  period VARCHAR(16) NOT NULL,
  original_period VARCHAR(16),
  room VARCHAR(40),
  status VARCHAR(24) NOT NULL DEFAULT 'normal',
  substitute_doctor VARCHAR(80),
  note TEXT,
  source_hash VARCHAR(128),
  synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE change_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id VARCHAR(96) NOT NULL REFERENCES appointments(id),
  change_type VARCHAR(24) NOT NULL,
  previous_value TEXT,
  current_value TEXT,
  message TEXT NOT NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_favorites (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id VARCHAR(96) NOT NULL,
  hospital_id VARCHAR(64) REFERENCES hospitals(id),
  doctor_id VARCHAR(64) REFERENCES doctors(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_favorites_target CHECK (hospital_id IS NOT NULL OR doctor_id IS NOT NULL)
);

CREATE TABLE telegram_subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id VARCHAR(96) NOT NULL,
  telegram_chat_id VARCHAR(96) NOT NULL UNIQUE,
  telegram_username VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id VARCHAR(96) NOT NULL,
  channel VARCHAR(24) NOT NULL DEFAULT 'telegram',
  telegram_chat_id VARCHAR(96),
  change_event_id BIGINT REFERENCES change_events(id),
  message TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  provider_response TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_date ON appointments(clinic_date);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_change_events_detected ON change_events(detected_at);
CREATE INDEX idx_telegram_subscriptions_user ON telegram_subscriptions(user_id);
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
