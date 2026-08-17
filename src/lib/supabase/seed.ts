import { createClient } from './client';
import { MOCK_LEADS, MOCK_CAMPAIGNS, MOCK_BUSINESS_SETTINGS } from '../mockData';

/**
 * Seed initial sample data into Supabase if the tables are currently empty.
 * This connects the database seamlessly for first-time use.
 */
export async function seedInitialDataIfNeeded() {
  try {
    const supabase = createClient();

    // 1. Check if leads table is empty
    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (leadCount === 0) {
      console.log('Seeding initial leads into Supabase...');

      const leadsToInsert = MOCK_LEADS.map((l) => ({
        name: l.name,
        phone: l.phone,
        business: l.business,
        category: l.category,
        status: l.temperature, // 'cold' | 'warm' | 'hot'
        campaign_status: l.status, // 'pending' | 'contacted' | 'replied' | 'qualified'
        notes: l.notes || '',
        created_at: l.createdAt,
      }));

      const { data: insertedLeads, error: leadErr } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (leadErr) {
        console.error('Error seeding leads:', leadErr);
      } else {
        console.log(`Successfully seeded ${insertedLeads?.length || 0} leads.`);
      }
    }

    // 2. Check if campaigns table is empty
    const { count: campaignCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    if (campaignCount === 0) {
      console.log('Seeding initial campaigns into Supabase...');

      const campaignsToInsert = MOCK_CAMPAIGNS.map((c) => ({
        name: c.name,
        target_audience: c.targetAudience,
        message_template: c.messageTemplate,
        total_leads: c.totalTarget,
        sent_count: c.contacted,
        reply_count: c.replied,
        status: c.status,
        created_at: c.createdAt,
      }));

      await supabase.from('campaigns').insert(campaignsToInsert);
    }

    // 3. Check if business_settings table is empty
    const { count: settingsCount } = await supabase
      .from('business_settings')
      .select('*', { count: 'exact', head: true });

    if (settingsCount === 0) {
      console.log('Seeding business settings into Supabase...');

      await supabase.from('business_settings').insert({
        business_name: MOCK_BUSINESS_SETTINGS.businessName,
        description: MOCK_BUSINESS_SETTINGS.description,
        services: MOCK_BUSINESS_SETTINGS.services,
        service_area: MOCK_BUSINESS_SETTINGS.serviceArea,
        portfolio_url: MOCK_BUSINESS_SETTINGS.website,
        contact_email: MOCK_BUSINESS_SETTINGS.email,
        whatsapp_number: MOCK_BUSINESS_SETTINGS.whatsappNumber,
        ai_instructions: MOCK_BUSINESS_SETTINGS.aiInstructions,
        auto_reply_enabled: MOCK_BUSINESS_SETTINGS.autoReplyEnabled,
      });
    }
  } catch (err) {
    console.error('Seed helper error:', err);
  }
}
