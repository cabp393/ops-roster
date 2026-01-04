create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists roles (
  organization_id uuid not null references organizations(id) on delete cascade,
  id text not null,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  counts_for_balance boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists tasks (
  organization_id uuid not null references organizations(id) on delete cascade,
  id text not null,
  name text not null,
  allowed_role_codes text[] not null default '{}',
  is_active boolean not null default true,
  equipment_type text,
  equipment_variant text,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists workers (
  organization_id uuid not null references organizations(id) on delete cascade,
  id integer not null,
  name text,
  first_name text not null,
  second_name text,
  last_name text not null,
  mother_last_name text,
  role_id text not null,
  contract text not null,
  constraints jsonb,
  specialty_task_id text,
  special_role text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, id),
  foreign key (organization_id, role_id) references roles(organization_id, id) on delete restrict
);

create table if not exists equipments (
  organization_id uuid not null references organizations(id) on delete cascade,
  id text not null,
  serie text not null,
  role_code text not null,
  type text not null,
  variant text not null,
  status text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists equipment_roles (
  organization_id uuid not null references organizations(id) on delete cascade,
  id text not null,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists equipment_types (
  organization_id uuid not null references organizations(id) on delete cascade,
  id text not null,
  name text not null,
  role_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists equipment_variants (
  organization_id uuid not null references organizations(id) on delete cascade,
  id text not null,
  name text not null,
  type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists equipment_statuses (
  organization_id uuid not null references organizations(id) on delete cascade,
  id text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table if not exists planning_records (
  organization_id uuid not null references organizations(id) on delete cascade,
  week_start text not null,
  columns jsonb not null default '{}'::jsonb,
  tasks_by_worker_id jsonb not null default '{}'::jsonb,
  equipment_by_worker_id jsonb not null default '{}'::jsonb,
  assignments jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, week_start)
);

create table if not exists assignments (
  organization_id uuid not null references organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  week_start text not null,
  worker_id integer not null,
  task_id text,
  equipment_id text,
  shift text not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (organization_id, week_start, worker_id),
  foreign key (organization_id, week_start) references planning_records(organization_id, week_start) on delete cascade,
  foreign key (organization_id, worker_id) references workers(organization_id, id) on delete cascade,
  foreign key (organization_id, task_id) references tasks(organization_id, id) on delete set null,
  foreign key (organization_id, equipment_id) references equipments(organization_id, id) on delete set null
);

create table if not exists shift_history (
  organization_id uuid not null references organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  week_start text not null,
  worker_id integer not null,
  task_id text,
  equipment_id text,
  shift text not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  foreign key (organization_id, worker_id) references workers(organization_id, id) on delete cascade,
  foreign key (organization_id, task_id) references tasks(organization_id, id) on delete set null,
  foreign key (organization_id, equipment_id) references equipments(organization_id, id) on delete set null
);

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table roles enable row level security;
alter table tasks enable row level security;
alter table workers enable row level security;
alter table equipments enable row level security;
alter table equipment_roles enable row level security;
alter table equipment_types enable row level security;
alter table equipment_variants enable row level security;
alter table equipment_statuses enable row level security;
alter table planning_records enable row level security;
alter table assignments enable row level security;
alter table shift_history enable row level security;

create policy "members can view organizations"
  on organizations for select
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = organizations.id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "authenticated users can create organizations"
  on organizations for insert
  with check (auth.uid() is not null);

create policy "members can update organizations"
  on organizations for update
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = organizations.id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = organizations.id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can view membership"
  on organization_members for select
  using (organization_members.user_id = auth.uid());

create policy "users can self-join organizations"
  on organization_members for insert
  with check (organization_members.user_id = auth.uid());

create policy "users can remove their membership"
  on organization_members for delete
  using (organization_members.user_id = auth.uid());

create policy "members can access roles"
  on roles for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = roles.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = roles.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access tasks"
  on tasks for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = tasks.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = tasks.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access workers"
  on workers for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = workers.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = workers.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access equipments"
  on equipments for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipments.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipments.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access equipment roles"
  on equipment_roles for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipment_roles.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipment_roles.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access equipment types"
  on equipment_types for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipment_types.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipment_types.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access equipment variants"
  on equipment_variants for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipment_variants.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipment_variants.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access equipment statuses"
  on equipment_statuses for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipment_statuses.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = equipment_statuses.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access planning records"
  on planning_records for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = planning_records.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = planning_records.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access assignments"
  on assignments for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = assignments.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = assignments.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create policy "members can access shift history"
  on shift_history for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = shift_history.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = shift_history.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

create index if not exists roles_organization_id_idx on roles (organization_id);
create index if not exists tasks_organization_id_idx on tasks (organization_id);
create index if not exists workers_organization_id_idx on workers (organization_id);
create index if not exists workers_role_id_idx on workers (organization_id, role_id);
create index if not exists equipments_organization_id_idx on equipments (organization_id);
create index if not exists planning_records_organization_week_idx on planning_records (organization_id, week_start);
create index if not exists assignments_organization_week_idx on assignments (organization_id, week_start);
create index if not exists assignments_worker_idx on assignments (organization_id, worker_id);
create index if not exists assignments_task_idx on assignments (organization_id, task_id);
create index if not exists assignments_equipment_idx on assignments (organization_id, equipment_id);
create index if not exists shift_history_org_worker_idx on shift_history (organization_id, worker_id, week_start);
create index if not exists shift_history_org_created_idx on shift_history (organization_id, created_at);
