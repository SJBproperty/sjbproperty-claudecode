const path = require('path');

const POSTCODES = ['SK1', 'SK2', 'SK3', 'SK4', 'SK5', 'SK6', 'SK7', 'SK8', 'M14', 'M19', 'M20', 'M21', 'M22'];

const EPC_API_BASE = 'https://epc.opendatacommunities.org/api/v1/domestic/search';

const CH_API_BASE = 'https://api.company-information.service.gov.uk';

const SNOV_API_BASE = 'https://api.snov.io';

const PROPERTY_SIC_CODES = '68100,68209,68320';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'sjb-leads.db');

const CCOD_PATH = path.join(__dirname, '..', '..', 'data', 'CCOD_FULL.csv');

const EXPORTS_DIR = path.join(__dirname, '..', '..', 'data', 'exports');

const HMO_DIR = path.join(__dirname, '..', '..', 'data', 'hmo-registers');

module.exports = {
  POSTCODES,
  EPC_API_BASE,
  CH_API_BASE,
  SNOV_API_BASE,
  PROPERTY_SIC_CODES,
  DB_PATH,
  CCOD_PATH,
  EXPORTS_DIR,
  HMO_DIR,
};
