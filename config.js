// Lectern — public client configuration.
// The anon/publishable key is designed to be public: row-level security in
// supabase/schema.sql ensures each signed-in user can only read and write
// their own rows. Never put a secret or service_role key in this file.
window.LECTERN_CONFIG = {
  supabaseUrl: 'https://sczrlpcgjmnaogwoqtnx.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjenJscGNnam1uYW9nd29xdG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NzUyMDgsImV4cCI6MjEwODI1MTIwOH0.aekWbDxX7mZ7lCf0vEjPb1adwhszA-t8M1EqnXogRs4',
};
