/** Curated hashtag catalog powering autocomplete + filter chips. */
export interface HashtagDef { tag: string; kind: 'denomination' | 'industry' | 'profession' | 'location' | 'type' | 'verification' | 'general'; }

const D = (tag: string): HashtagDef => ({ tag, kind: 'denomination' });
const I = (tag: string): HashtagDef => ({ tag, kind: 'industry' });
const P = (tag: string): HashtagDef => ({ tag, kind: 'profession' });
const L = (tag: string): HashtagDef => ({ tag, kind: 'location' });
const T = (tag: string): HashtagDef => ({ tag, kind: 'type' });
const V = (tag: string): HashtagDef => ({ tag, kind: 'verification' });
const G = (tag: string): HashtagDef => ({ tag, kind: 'general' });

export const HASHTAG_CATALOG: HashtagDef[] = [
  // Denominations / traditions
  D('Catholic'), D('Orthodox'), D('Anglican'), D('Episcopal'), D('Lutheran'),
  D('Presbyterian'), D('Reformed'), D('Baptist'), D('Methodist'), D('Pentecostal'),
  D('Charismatic'), D('Evangelical'), D('NonDenominational'), D('Anabaptist'),
  D('Adventist'), D('Messianic'), D('Wesleyan'), D('ChurchOfChrist'), D('AssembliesOfGod'),
  // Listing types
  T('Church'), T('Ministry'), T('Business'), T('Nonprofit'), T('School'),
  T('Event'), T('Conference'), T('Retreat'), T('MissionTrip'), T('Professional'),
  // Industries
  I('Bakery'), I('Construction'), I('Healthcare'), I('Legal'), I('Finance'),
  I('RealEstate'), I('Education'), I('Hospitality'), I('Media'), I('Retail'),
  I('HomeServices'), I('Automotive'), I('FoodAndBeverage'), I('Counseling'),
  // Professions
  P('Electrician'), P('Plumber'), P('Photographer'), P('Counselor'), P('Therapist'),
  P('Attorney'), P('Realtor'), P('Accountant'), P('Designer'), P('Developer'),
  P('Pastor'), P('WorshipLeader'), P('Author'), P('Speaker'), P('Contractor'),
  // Locations
  L('Dallas'), L('Atlanta'), L('Nashville'), L('Houston'), L('Austin'), L('Phoenix'),
  L('Chicago'), L('Orlando'), L('Charlotte'), L('Denver'), L('Texas'), L('Georgia'),
  // Verification / trust
  V('Verified'), V('ChristianOwned'), V('Claimed'), V('Licensed'), V('Accredited'),
  // General / values
  G('FamilyOwned'), G('SpanishSpeaking'), G('WheelchairAccess'), G('FinancingAvailable'),
  G('OnlineServices'), G('VeteranOwned'), G('WomenOwned'), G('YouthMinistry'),
  G('WorshipNight'), G('FoodDrive'), G('Volunteer'), G('BibleStudy'), G('PrayerGroup'),
];
