/**
 * Texas Railroad Commission data source constants
 */

// GoAnywhere MFT portal links (these serve a JSF page with file listings)
export const MFT_LINKS = {
  // Production Data Query dump — CSV, 1993-current, ~3.4 GB zipped
  PDQ_DUMP: 'https://mft.rrc.texas.gov/link/1f5ddb8d-329a-4459-b7f8-177b4f5ee60d',
  // P5 Organization (operators) — ASCII format
  P5_ORG: 'https://mft.rrc.texas.gov/link/04652169-eed6-4396-9019-2e270e790f6c',
  // Full Wellbore — ASCII format
  WELLBORE: 'https://mft.rrc.texas.gov/link/b070ce28-5c58-4fe2-9eb7-8b70befb7af9',
  // Drilling Permits with lat/long — ASCII format
  DRILLING_PERMITS: 'https://mft.rrc.texas.gov/link/5f07cc72-2e79-4df8-ade1-9aeb792e03fc',
  // Statewide API data (wells with lat/long) — dBase format
  API_DATA_DBF: 'https://mft.rrc.texas.gov/link/1eb94d66-461d-4114-93f7-b4bc04a70674',
  // Statewide API data — ASCII format
  API_DATA_ASCII: 'https://mft.rrc.texas.gov/link/701db9a3-32b5-488d-812b-cd6ff7d0fe85',
} as const;

// PDQ (Production Data Query) web interface
export const PDQ_BASE_URL = 'https://webapps.rrc.texas.gov/PDQ';
export const PDQ_GENERAL_QUERY = `${PDQ_BASE_URL}/generalReportAction.do`;

// RRC Districts (Texas is divided into these oil & gas regulatory districts)
export const RRC_DISTRICTS: Record<string, string> = {
  '01': 'San Antonio',
  '02': 'Refugio',
  '03': 'Southeast Texas',
  '04': 'Deep South Texas',
  '05': 'East Central Texas',
  '06': 'East Texas',
  '6E': 'East Texas (East)',
  '7B': 'West Central Texas',
  '7C': 'San Angelo',
  '08': 'Midland',
  '8A': 'Lubbock',
  '09': 'North Texas',
  '10': 'Panhandle',
};

// Texas FIPS county codes (subset of the most common oil/gas counties)
// Full list at: https://www.rrc.texas.gov/about-us/locations/oil-gas-counties-districts/
export const TX_COUNTY_CODES: Record<string, string> = {
  '001': 'ANDERSON', '003': 'ANDREWS', '005': 'ANGELINA', '007': 'ARANSAS',
  '009': 'ARCHER', '011': 'ARMSTRONG', '013': 'ATASCOSA', '015': 'AUSTIN',
  '017': 'BAILEY', '019': 'BANDERA', '021': 'BASTROP', '023': 'BAYLOR',
  '025': 'BEE', '027': 'BELL', '029': 'BEXAR', '031': 'BLANCO',
  '033': 'BORDEN', '035': 'BOSQUE', '037': 'BOWIE', '039': 'BRAZORIA',
  '041': 'BRAZOS', '043': 'BREWSTER', '045': 'BRISCOE', '047': 'BROOKS',
  '049': 'BROWN', '051': 'BURLESON', '053': 'BURNET', '055': 'CALDWELL',
  '057': 'CALHOUN', '059': 'CALLAHAN', '061': 'CAMERON', '063': 'CAMP',
  '065': 'CARSON', '067': 'CASS', '069': 'CASTRO', '071': 'CHAMBERS',
  '073': 'CHEROKEE', '075': 'CHILDRESS', '077': 'CLAY', '079': 'COCHRAN',
  '081': 'COKE', '083': 'COLEMAN', '085': 'COLLIN', '087': 'COLLINGSWORTH',
  '089': 'COLORADO', '091': 'COMAL', '093': 'COMANCHE', '095': 'CONCHO',
  '097': 'COOKE', '099': 'CORYELL', '101': 'COTTLE', '103': 'CRANE',
  '105': 'CROCKETT', '107': 'CROSBY', '109': 'CULBERSON', '111': 'DALLAM',
  '113': 'DALLAS', '115': 'DAWSON', '117': 'DEAF SMITH', '119': 'DELTA',
  '121': 'DENTON', '123': 'DEWITT', '125': 'DICKENS', '127': 'DIMMIT',
  '129': 'DONLEY', '131': 'DUVAL', '133': 'EASTLAND', '135': 'ECTOR',
  '137': 'EDWARDS', '139': 'ELLIS', '141': 'EL PASO', '143': 'ERATH',
  '145': 'FALLS', '147': 'FANNIN', '149': 'FAYETTE', '151': 'FISHER',
  '153': 'FLOYD', '155': 'FOARD', '157': 'FORT BEND', '159': 'FRANKLIN',
  '161': 'FREESTONE', '163': 'FRIO', '165': 'GAINES', '167': 'GALVESTON',
  '169': 'GARZA', '171': 'GILLESPIE', '173': 'GLASSCOCK', '175': 'GOLIAD',
  '177': 'GONZALES', '179': 'GRAY', '181': 'GRAYSON', '183': 'GREGG',
  '185': 'GRIMES', '187': 'GUADALUPE', '189': 'HALE', '191': 'HALL',
  '193': 'HAMILTON', '195': 'HANSFORD', '197': 'HARDEMAN', '199': 'HARDIN',
  '201': 'HARRIS', '203': 'HARRISON', '205': 'HARTLEY', '207': 'HASKELL',
  '209': 'HAYS', '211': 'HEMPHILL', '213': 'HENDERSON', '215': 'HIDALGO',
  '217': 'HILL', '219': 'HOCKLEY', '221': 'HOOD', '223': 'HOPKINS',
  '225': 'HOUSTON', '227': 'HOWARD', '229': 'HUDSPETH', '231': 'HUNT',
  '233': 'HUTCHINSON', '235': 'IRION', '237': 'JACK', '239': 'JACKSON',
  '241': 'JASPER', '243': 'JEFF DAVIS', '245': 'JEFFERSON', '247': 'JIM HOGG',
  '249': 'JIM WELLS', '251': 'JOHNSON', '253': 'JONES', '255': 'KARNES',
  '257': 'KAUFMAN', '259': 'KENDALL', '261': 'KENEDY', '263': 'KENT',
  '265': 'KERR', '267': 'KIMBLE', '269': 'KING', '271': 'KINNEY',
  '273': 'KLEBERG', '275': 'KNOX', '277': 'LAMAR', '279': 'LAMB',
  '281': 'LAMPASAS', '283': 'LASALLE', '285': 'LAVACA', '287': 'LEE',
  '289': 'LEON', '291': 'LIBERTY', '293': 'LIMESTONE', '295': 'LIPSCOMB',
  '297': 'LIVE OAK', '299': 'LLANO', '301': 'LOVING', '303': 'LUBBOCK',
  '305': 'LYNN', '307': 'MADISON', '309': 'MARION', '311': 'MARTIN',
  '313': 'MASON', '315': 'MATAGORDA', '317': 'MAVERICK', '319': 'MCCULLOCH',
  '321': 'MCLENNAN', '323': 'MCMULLEN', '325': 'MEDINA', '327': 'MENARD',
  '329': 'MIDLAND', '331': 'MILAM', '333': 'MILLS', '335': 'MITCHELL',
  '337': 'MONTAGUE', '339': 'MONTGOMERY', '341': 'MOORE', '343': 'MORRIS',
  '345': 'MOTLEY', '347': 'NACOGDOCHES', '349': 'NAVARRO', '351': 'NEWTON',
  '353': 'NOLAN', '355': 'NUECES', '357': 'OCHILTREE', '359': 'OLDHAM',
  '361': 'ORANGE', '363': 'PALO PINTO', '365': 'PANOLA', '367': 'PARKER',
  '369': 'PARMER', '371': 'PECOS', '373': 'POLK', '375': 'POTTER',
  '377': 'PRESIDIO', '379': 'RAINS', '381': 'RANDALL', '383': 'REAGAN',
  '385': 'REAL', '387': 'RED RIVER', '389': 'REEVES', '391': 'REFUGIO',
  '393': 'ROBERTS', '395': 'ROBERTSON', '397': 'ROCKWALL', '399': 'RUNNELS',
  '401': 'RUSK', '403': 'SABINE', '405': 'SAN AUGUSTINE', '407': 'SAN JACINTO',
  '409': 'SAN PATRICIO', '411': 'SAN SABA', '413': 'SCHLEICHER', '415': 'SCURRY',
  '417': 'SHACKELFORD', '419': 'SHELBY', '421': 'SHERMAN', '423': 'SMITH',
  '425': 'SOMERVELL', '427': 'STARR', '429': 'STEPHENS', '431': 'STERLING',
  '433': 'STONEWALL', '435': 'SUTTON', '437': 'SWISHER', '439': 'TARRANT',
  '441': 'TAYLOR', '443': 'TERRELL', '445': 'TERRY', '447': 'THROCKMORTON',
  '449': 'TITUS', '451': 'TOM GREEN', '453': 'TRAVIS', '455': 'TRINITY',
  '457': 'TYLER', '459': 'UPSHUR', '461': 'UPTON', '463': 'UVALDE',
  '465': 'VAL VERDE', '467': 'VAN ZANDT', '469': 'VICTORIA', '471': 'WALKER',
  '473': 'WALLER', '475': 'WARD', '477': 'WASHINGTON', '479': 'WEBB',
  '481': 'WHARTON', '483': 'WHEELER', '485': 'WICHITA', '487': 'WILBARGER',
  '489': 'WILLACY', '491': 'WILLIAMSON', '493': 'WILSON', '495': 'WINKLER',
  '497': 'WISE', '499': 'WOOD', '501': 'YOAKUM', '503': 'YOUNG',
  '505': 'ZAPATA', '507': 'ZAVALA',
};

// Texas API number format: 42-XXX-XXXXX where 42 = Texas state code
export const TX_STATE_CODE = '42';

// Basin mapping based on county/district
export const BASIN_BY_DISTRICT: Record<string, string> = {
  '01': 'Gulf Coast',
  '02': 'Gulf Coast',
  '03': 'Gulf Coast',
  '04': 'Gulf Coast',
  '05': 'East Texas',
  '06': 'East Texas',
  '6E': 'East Texas',
  '7B': 'West Central Texas',
  '7C': 'Permian Basin',
  '08': 'Permian Basin',
  '8A': 'Permian Basin',
  '09': 'North Texas / Barnett',
  '10': 'Anadarko / Panhandle',
};
