const { SupabaseService } = require('./dist/services/supabase.service');

async function inspectCategories() {
  const supabase = SupabaseService.getClient();
  const { data, error } = await supabase
    .from('home_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }

  console.log(`Total Categories currently in Supabase: ${data.length}\n`);
  data.forEach(c => {
    console.log(`[#${String(c.sort_order).padStart(2, '0')}] ${c.id.padEnd(32)} | ${c.title.padEnd(46)} | ${(c.title_ar || '-').padEnd(35)} | ${c.category_type.padEnd(12)} | (${c.movie_count} titles)`);
  });
}

inspectCategories().catch(console.error);
