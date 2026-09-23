/**
 * Denomination taxonomy — neutral, descriptive, non-ranking.
 * Parent traditions → denominations, with aliases + search terms.
 * Classifications may overlap and vary by region.
 */
export interface Denomination {
  slug: string;
  name: string;
  tradition: string;
  aliases: string[];
  searchTerms: string[];
  description: string;
  children?: Denomination[];
}

export interface Tradition { slug: string; name: string; description: string; }

export const TRADITIONS: Tradition[] = [
  { slug: 'catholic', name: 'Catholic Traditions', description: 'Churches in communion with Rome and related Catholic bodies, including Eastern Catholic churches.' },
  { slug: 'eastern-orthodox', name: 'Eastern Orthodox Traditions', description: 'Chalcedonian Orthodox churches following Byzantine tradition and liturgy.' },
  { slug: 'oriental-orthodox', name: 'Oriental Orthodox Traditions', description: 'Non-Chalcedonian Orthodox churches including Coptic, Ethiopian, Eritrean, Armenian, and Syriac bodies.' },
  { slug: 'anglican-episcopal', name: 'Anglican & Episcopal Traditions', description: 'Churches rooted in the Anglican Communion and Continuing Anglican movement.' },
  { slug: 'lutheran', name: 'Lutheran Traditions', description: 'Churches confessing the Lutheran Confessions and Reformation heritage.' },
  { slug: 'reformed-presbyterian', name: 'Reformed & Presbyterian Traditions', description: 'Churches shaped by Reformed confessions, presbyterian polity, or continental Reformed roots.' },
  { slug: 'baptist', name: 'Baptist Traditions', description: 'Believer’s-baptism congregations across many conventions and fellowships.' },
  { slug: 'methodist-wesleyan', name: 'Methodist & Wesleyan Traditions', description: 'Churches in the Wesleyan-holiness stream, including Methodist and Holiness bodies.' },
  { slug: 'pentecostal-charismatic', name: 'Pentecostal & Charismatic Traditions', description: 'Churches emphasizing the gifts and work of the Holy Spirit.' },
  { slug: 'evangelical', name: 'Evangelical Traditions', description: 'Gospel-centered churches and networks across denominational lines.' },
  { slug: 'anabaptist', name: 'Anabaptist Traditions', description: 'Mennonite, Amish, Brethren, and related peace-church fellowships.' },
  { slug: 'restorationist', name: 'Restorationist Traditions', description: 'Churches of the Stone-Campbell Restoration Movement and related bodies.' },
  { slug: 'adventist', name: 'Adventist Traditions', description: 'Churches in the Advent movement emphasizing Christ’s return.' },
  { slug: 'non-denominational', name: 'Non-Denominational & Independent', description: 'Independent congregations without formal denominational affiliation.' },
  { slug: 'messianic', name: 'Messianic Congregations', description: 'Jewish-following-Yeshua congregations blending Jewish heritage and Christian faith.' },
  { slug: 'african-initiated', name: 'African-Initiated Churches', description: 'Indigenous African church movements and global diaspora congregations.' },
  { slug: 'other', name: 'Other Christian Traditions', description: 'Additional fellowships, networks, and emerging expressions of the faith.' },
];

export const DENOMINATIONS: Denomination[] = [
  { slug: 'roman-catholic', name: 'Roman Catholic', tradition: 'catholic', aliases: ['Catholic Church'], searchTerms: ['catholic', 'mass', 'parish', 'diocese'], description: 'Parishes and ministries in full communion with the Bishop of Rome.' },
  { slug: 'eastern-catholic', name: 'Eastern Catholic', tradition: 'catholic', aliases: ['Byzantine Catholic', 'Maronite', 'Melkite', 'Ukrainian Greek Catholic'], searchTerms: ['byzantine', 'maronite', 'melkite', 'eastern rite'], description: 'Eastern-rite churches in communion with Rome.' },
  { slug: 'greek-orthodox', name: 'Greek Orthodox', tradition: 'eastern-orthodox', aliases: ['GOARCH'], searchTerms: ['orthodox', 'divine liturgy', 'greek'], description: 'Parishes of the Greek Orthodox tradition.' },
  { slug: 'orthodox-church-in-america', name: 'Orthodox Church in America', tradition: 'eastern-orthodox', aliases: ['OCA'], searchTerms: ['orthodox', 'oca'], description: 'Autocephalous Orthodox church with deep North American roots.' },
  { slug: 'coptic-orthodox', name: 'Coptic Orthodox', tradition: 'oriental-orthodox', aliases: ['Coptic'], searchTerms: ['coptic', 'egyptian'], description: 'One of the oldest continuous Christian traditions, centered in Egypt.' },
  { slug: 'ethiopian-orthodox', name: 'Ethiopian Orthodox Tewahedo', tradition: 'oriental-orthodox', aliases: ['Ethiopian'], searchTerms: ['ethiopian', 'tewahedo'], description: 'Ancient Ethiopian church with rich liturgical life.' },
  { slug: 'episcopal', name: 'Episcopal Church', tradition: 'anglican-episcopal', aliases: ['TEC'], searchTerms: ['episcopal', 'book of common prayer'], description: 'U.S.-based province of the worldwide Anglican Communion.' },
  { slug: 'acna', name: 'Anglican Church in North America', tradition: 'anglican-episcopal', aliases: ['ACNA'], searchTerms: ['anglican', 'acna'], description: 'A North American Anglican province formed in 2009.' },
  { slug: 'elca', name: 'Evangelical Lutheran Church in America', tradition: 'lutheran', aliases: ['ELCA'], searchTerms: ['lutheran', 'elca'], description: 'The largest Lutheran body in the United States.' },
  { slug: 'lcms', name: 'Lutheran Church—Missouri Synod', tradition: 'lutheran', aliases: ['LCMS', 'Missouri Synod'], searchTerms: ['lutheran', 'missouri synod', 'lcms'], description: 'A confessional Lutheran synod headquartered in St. Louis.' },
  { slug: 'pcusa', name: 'Presbyterian Church (U.S.A.)', tradition: 'reformed-presbyterian', aliases: ['PCUSA'], searchTerms: ['presbyterian', 'pcusa'], description: 'The largest Presbyterian denomination in the U.S.' },
  { slug: 'pca', name: 'Presbyterian Church in America', tradition: 'reformed-presbyterian', aliases: ['PCA'], searchTerms: ['presbyterian', 'pca', 'reformed'], description: 'A conservative Presbyterian denomination founded in 1973.' },
  { slug: 'crcna', name: 'Christian Reformed Church', tradition: 'reformed-presbyterian', aliases: ['CRCNA', 'Christian Reformed'], searchTerms: ['reformed', 'calvinist', 'crc'], description: 'A Reformed denomination with Dutch roots.' },
  { slug: 'southern-baptist', name: 'Southern Baptist Convention', tradition: 'baptist', aliases: ['SBC', 'Southern Baptist'], searchTerms: ['baptist', 'southern baptist', 'sbc'], description: 'The largest Baptist convention and Protestant body in the U.S.' },
  { slug: 'american-baptist', name: 'American Baptist Churches USA', tradition: 'baptist', aliases: ['ABCUSA'], searchTerms: ['baptist', 'american baptist'], description: 'A mainline Baptist denomination known for local-church autonomy.' },
  { slug: 'independent-baptist', name: 'Independent Baptist', tradition: 'baptist', aliases: ['IFB'], searchTerms: ['independent baptist', 'fundamental baptist'], description: 'Autonomous Baptist congregations outside major conventions.' },
  { slug: 'united-methodist', name: 'United Methodist Church', tradition: 'methodist-wesleyan', aliases: ['UMC'], searchTerms: ['methodist', 'umc', 'wesleyan'], description: 'A global Methodist denomination in the Wesleyan tradition.' },
  { slug: 'global-methodist', name: 'Global Methodist Church', tradition: 'methodist-wesleyan', aliases: ['GMC'], searchTerms: ['methodist', 'global methodist'], description: 'A Methodist denomination formed in 2022.' },
  { slug: 'nazarene', name: 'Church of the Nazarene', tradition: 'methodist-wesleyan', aliases: ['Nazarene'], searchTerms: ['nazarene', 'holiness'], description: 'A Wesleyan-holiness denomination with global missions.' },
  { slug: 'assemblies-of-god', name: 'Assemblies of God', tradition: 'pentecostal-charismatic', aliases: ['AG'], searchTerms: ['assemblies of god', 'pentecostal', 'ag'], description: 'The world’s largest Pentecostal fellowship.' },
  { slug: 'church-of-god-cleveland', name: 'Church of God (Cleveland)', tradition: 'pentecostal-charismatic', aliases: ['COG'], searchTerms: ['church of god', 'pentecostal'], description: 'A classical Pentecostal denomination founded in 1886.' },
  { slug: 'foursquare', name: 'Foursquare Church', tradition: 'pentecostal-charismatic', aliases: ['ICFG'], searchTerms: ['foursquare', 'pentecostal'], description: 'A Pentecostal movement founded by Aimee Semple McPherson.' },
  { slug: 'vineyard', name: 'Vineyard Churches', tradition: 'evangelical', aliases: ['Vineyard USA'], searchTerms: ['vineyard', 'charismatic', 'evangelical'], description: 'A church-planting movement blending worship and mercy ministry.' },
  { slug: 'calvary-chapel', name: 'Calvary Chapel', tradition: 'evangelical', aliases: ['Calvary'], searchTerms: ['calvary chapel', 'expository'], description: 'A fellowship known for verse-by-verse Bible teaching.' },
  { slug: 'mennonite', name: 'Mennonite', tradition: 'anabaptist', aliases: ['MC USA'], searchTerms: ['mennonite', 'anabaptist', 'peace church'], description: 'Anabaptist churches emphasizing discipleship and peacemaking.' },
  { slug: 'church-of-christ', name: 'Churches of Christ', tradition: 'restorationist', aliases: ['Church of Christ'], searchTerms: ['church of christ', 'restoration', 'a cappella'], description: 'Autonomous congregations of the Restoration Movement.' },
  { slug: 'christian-church', name: 'Christian Church (Disciples of Christ)', tradition: 'restorationist', aliases: ['Disciples of Christ', 'DOC'], searchTerms: ['disciples of christ', 'restoration'], description: 'A mainline denomination of the Stone-Campbell movement.' },
  { slug: 'seventh-day-adventist', name: 'Seventh-day Adventist', tradition: 'adventist', aliases: ['SDA', 'Adventist'], searchTerms: ['adventist', 'sabbath', 'sda'], description: 'A global church emphasizing Sabbath rest and wholistic health.' },
  { slug: 'non-denominational', name: 'Non-Denominational', tradition: 'non-denominational', aliases: ['ND', 'Independent'], searchTerms: ['non-denominational', 'nondenominational', 'independent', 'community church'], description: 'Independent congregations without denominational oversight.' },
  { slug: 'messianic-jewish', name: 'Messianic Jewish', tradition: 'messianic', aliases: ['Messianic'], searchTerms: ['messianic', 'yeshua', 'jewish believer'], description: 'Congregations of Jewish and Gentile believers in Yeshua (Jesus).' },
  { slug: 'rccg', name: 'Redeemed Christian Church of God', tradition: 'african-initiated', aliases: ['RCCG'], searchTerms: ['rccg', 'redeemed', 'nigerian church'], description: 'A global Pentecostal movement founded in Nigeria.' },
  { slug: 'cogic', name: 'Church of God in Christ', tradition: 'pentecostal-charismatic', aliases: ['COGIC'], searchTerms: ['cogic', 'holiness pentecostal'], description: 'The largest Pentecostal denomination in the U.S., historically Black.' },
];

export const traditionBySlug = (slug: string) => TRADITIONS.find((t) => t.slug === slug);
export const denominationBySlug = (slug: string) => DENOMINATIONS.find((d) => d.slug === slug);
export const denominationsByTradition = (tradition: string) =>
  DENOMINATIONS.filter((d) => d.tradition === tradition);
