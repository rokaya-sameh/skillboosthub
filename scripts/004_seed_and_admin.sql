-- ============================================================
-- Seed data + how to make yourself the admin
-- Run this LAST, AFTER you have signed up at least one account.
-- ============================================================

-- 1) PROMOTE YOURSELF TO ADMIN
--    Replace the email with the account you signed up with.
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and u.email = 'rokayasameh292@gmail.com';   -- <-- CHANGE THIS

-- 2) Seed achievement badges (light gamification)
insert into public.badges (name, description, icon, rarity) values
  ('First Steps',    'Completed your first lesson.',        'Footprints', 'common'),
  ('Task Finisher',  'Submitted your first task.',          'CheckCircle','common'),
  ('Streak Master',  'Maintained a 7-day study streak.',    'Flame',      'rare'),
  ('Capstone Hero',  'Scored 90%+ on a capstone.',          'Trophy',     'epic'),
  ('Top of Class',   'Reached a 3.8+ GPA.',                 'Crown',      'legendary')
on conflict do nothing;

-- 3) (Optional) Seed a sample published course owned by the first instructor.
--    This only runs if at least one instructor exists.
do $$
declare inst uuid;
declare cid uuid;
declare mid uuid;
declare lid uuid;
begin
  select id into inst from public.profiles where role in ('instructor','admin') limit 1;
  if inst is null then return; end if;

  insert into public.courses (title, slug, description, category, level, instructor_id, published)
  values ('Frontend Engineering Fundamentals', 'frontend-fundamentals',
          'Build modern, accessible web interfaces with React and TypeScript.',
          'Engineering', 'beginner', inst, true)
  returning id into cid;

  insert into public.modules (course_id, title, position)
  values (cid, 'Getting Started', 1) returning id into mid;

  insert into public.lessons (module_id, title, content, duration_minutes, position)
  values (mid, 'Welcome & Setup', 'Set up your development environment.', 15, 1)
  returning id into lid;

  insert into public.lessons (module_id, title, content, duration_minutes, position)
  values (mid, 'Your First Component', 'Learn JSX and components.', 25, 2);

  insert into public.tasks (course_id, lesson_id, title, description, max_points, is_capstone, position)
  values (cid, lid, 'Build a Profile Card', 'Create a responsive profile card component.', 100, false, 1);

  insert into public.tasks (course_id, title, description, max_points, is_capstone, position)
  values (cid, 'Capstone: Portfolio Site', 'Ship a full portfolio website.', 100, true, 99);
end $$;
