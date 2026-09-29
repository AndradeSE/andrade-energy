import { createClient } from '@supabase/supabase-js';
import { isPreviewEnvironment } from './config/environment';

// O Preview usa uma API e um banco separados. A chave aqui é publicável;
// a chave secreta de cada projeto fica exclusivamente no respectivo backend.
const homologacao = isPreviewEnvironment;

const supabaseUrl = homologacao
  ? 'https://qqhcjieymypowunkixmk.supabase.co'
  : 'https://ehnkyrsseisvvtbkwrvu.supabase.co';

const supabaseKey = homologacao
  ? 'sb_publishable_6jAdi6xuQNUJBzcZGKMZlw_b2cXZPY-'
  : 'sb_publishable_AoM8LkzG2g7gT8zWA736CA_0MgNblZm';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
