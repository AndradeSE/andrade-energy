import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  'https://ehnkyrsseisvvtbkwrvu.supabase.co';

const supabaseKey =
  'sb_publishable_AoM8LkzG2g7gT8zWA736CA_0MgNblZm';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);