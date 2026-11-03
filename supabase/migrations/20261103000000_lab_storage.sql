-- Lab: a private file area for the site admin's own study resources (Admin → Lab).
-- The bucket is NOT public: files can't be opened by URL. Only platform admins can list, upload,
-- download (through short-lived signed links) or delete. Artists and visitors have no access.
-- Files are organised in folders by subject: lab/<subject>/<file>.

insert into storage.buckets (id, name, public, file_size_limit)
values ('lab', 'lab', false, 52428800) -- 50 MB per file
on conflict (id) do nothing;

create policy "platform admins read lab files" on storage.objects
  for select to authenticated using (bucket_id = 'lab' and public.is_platform_admin());

create policy "platform admins upload lab files" on storage.objects
  for insert to authenticated with check (bucket_id = 'lab' and public.is_platform_admin());

create policy "platform admins update lab files" on storage.objects
  for update to authenticated using (bucket_id = 'lab' and public.is_platform_admin())
  with check (bucket_id = 'lab' and public.is_platform_admin());

create policy "platform admins delete lab files" on storage.objects
  for delete to authenticated using (bucket_id = 'lab' and public.is_platform_admin());
