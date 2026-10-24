/**
 * Tianum Networth Managers - API Admin Handler (Node / Vercel)
 */
const globalEnquiries = global.__TIANUM_GLOBAL_ENQUIRIES__ || (global.__TIANUM_GLOBAL_ENQUIRIES__ = [
  {
    id: 1,
    name: 'Vikramaditya Singhania',
    email: 'v.singhania@singhaniaholdings.com',
    mobile: '+91 98220 14820',
    subject: 'Wealth Management & Multi-Asset Allocation',
    message: 'Looking for fiduciary consultation on structuring family office investments and private wealth across PMS/AIFs.',
    status: 'New',
    is_read: false,
    created_at: '2026-10-13 14:15:22',
    updated_at: '2026-10-13 14:15:22'
  },
  {
    id: 2,
    name: 'Sunil Kulkarni',
    email: 'sunil.kulkarni@techapex.in',
    mobile: '+91 94225 33019',
    subject: 'Corporate Treasury & Fixed Income',
    message: 'Interested in debt syndication and liquidity management solutions for our mid-market tech firm in Pune.',
    status: 'In Progress',
    is_read: true,
    created_at: '2026-10-12 16:40:10',
    updated_at: '2026-10-13 09:20:00'
  },
  {
    id: 3,
    name: 'Ananya Deshmukh',
    email: 'ananya.d@nexuscap.com',
    mobile: '+91 97640 21908',
    subject: 'Investment Banking & M&A Advisory',
    message: 'Seeking advisory on Series B growth capital and institutional equity placements in Maharashtra.',
    status: 'Resolved',
    is_read: true,
    created_at: '2026-10-11 11:25:00',
    updated_at: '2026-10-12 18:00:00'
  },
  {
    id: 4,
    name: 'Dr. Rajeshwar Rao',
    email: 'dr.rao.cardio@apollohealth.org',
    mobile: '+91 98501 77234',
    subject: 'Portfolio Management Services (PMS)',
    message: 'Need a comprehensive portfolio audit of existing equity mutual funds and advisory on direct indexed equities.',
    status: 'New',
    is_read: false,
    created_at: '2026-10-10 18:10:45',
    updated_at: '2026-10-10 18:10:45'
  }
]);

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  const body = req.body || {};

  if (url.includes('/status') && req.method === 'POST') {
    const item = globalEnquiries.find(e => String(e.id) === String(body.id));
    if (item) {
      item.status = body.status;
      item.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    }
    return res.status(200).json({ status: 'success', message: 'Status updated' });
  }

  if (url.includes('/read') && req.method === 'POST') {
    const item = globalEnquiries.find(e => String(e.id) === String(body.id));
    if (item) {
      item.is_read = !item.is_read;
    }
    return res.status(200).json({ status: 'success', message: 'Read state updated' });
  }

  if (url.includes('/delete') && req.method === 'POST') {
    const idx = globalEnquiries.findIndex(e => String(e.id) === String(body.id));
    if (idx !== -1) {
      globalEnquiries.splice(idx, 1);
    }
    return res.status(200).json({ status: 'success', message: 'Enquiry deleted' });
  }

  if (url.includes('/stats')) {
    return res.status(200).json({
      status: 'success',
      total: globalEnquiries.length,
      unread: globalEnquiries.filter(e => !e.is_read || e.status === 'New').length,
      in_progress: globalEnquiries.filter(e => e.status === 'In Progress').length,
      resolved: globalEnquiries.filter(e => e.status === 'Resolved').length
    });
  }

  // Default: enquiries list
  return res.status(200).json({
    status: 'success',
    enquiries: globalEnquiries
  });
};
