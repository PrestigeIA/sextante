-- Sextante domain schema. Every table is scoped to "user"."id" and cascades on
-- account deletion (App Store Guideline 5.1.1(v)). Money columns are numeric
-- and cast to float8 when read (see src/lib/journal/*.ts).

-- Subscription entitlement: one row per user. Web = Stripe, apps = RevenueCat.
create table if not exists "sextante_subscription" (
  "user_id" text not null primary key references "user" ("id") on delete cascade,
  "status" text not null check ("status" in ('trialing', 'active', 'past_due', 'canceled')),
  "plan" text not null check ("plan" in ('monthly', 'annual')),
  "provider" text not null check ("provider" in ('stripe', 'app_store', 'play_store', 'revenuecat')),
  "provider_customer_id" text,
  "provider_subscription_id" text,
  "current_period_end" timestamptz,
  "created_at" timestamptz default current_timestamp not null,
  "updated_at" timestamptz default current_timestamp not null
);

create index if not exists "sextante_subscription_customer_idx"
  on "sextante_subscription" ("provider_customer_id");

-- Trade journal. Prices are per share; one contract = 100 shares.
create table if not exists "sextante_trade" (
  "id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "account" text not null default 'paper' check ("account" in ('paper', 'real')),
  "strategy" text not null,
  "underlying" text not null,
  "legs_text" text not null default '',
  "direction" text not null check ("direction" in ('credit', 'debit')),
  "contracts" integer not null check ("contracts" > 0),
  "entry_price" numeric(12, 4) not null check ("entry_price" >= 0),
  "max_risk" numeric(14, 2) not null check ("max_risk" >= 0),
  "fees" numeric(10, 2) not null default 0 check ("fees" >= 0),
  "opened_at" date not null,
  "expires_at" date,
  "status" text not null default 'open' check ("status" in ('open', 'closed')),
  "mark_price" numeric(12, 4),
  "exit_price" numeric(12, 4),
  "closed_at" date,
  "followed_plan" boolean not null default true,
  "notes" text not null default '',
  "created_at" timestamptz default current_timestamp not null,
  "updated_at" timestamptz default current_timestamp not null
);

create index if not exists "sextante_trade_user_idx" on "sextante_trade" ("user_id", "opened_at" desc);

-- Saved simulator setups.
create table if not exists "sextante_simulation" (
  "id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "name" text not null,
  "strategy" text not null,
  "payload" jsonb not null,
  "created_at" timestamptz default current_timestamp not null
);

create index if not exists "sextante_simulation_user_idx" on "sextante_simulation" ("user_id", "created_at" desc);

-- Academy progress: one row per completed lesson.
create table if not exists "sextante_lesson_progress" (
  "user_id" text not null references "user" ("id") on delete cascade,
  "lesson_id" text not null,
  "completed_at" timestamptz default current_timestamp not null,
  primary key ("user_id", "lesson_id")
);

-- Messages sent from the in-app support form.
create table if not exists "sextante_support_message" (
  "id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "email" text not null,
  "subject" text not null,
  "body" text not null,
  "created_at" timestamptz default current_timestamp not null,
  "resolved_at" timestamptz
);

create index if not exists "sextante_support_message_user_idx" on "sextante_support_message" ("user_id");
