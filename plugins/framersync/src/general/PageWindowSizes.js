import { framer } from "framer-plugin";

const pageSizes = {
  Integrations: {
    width: 500,
    height: 350,
  },
  Authenticate: {
    width: 350,
    height: 350,
  },
  SelectDatabaseWide: {
    width: 750,
    height: 550,
  },
  SelectDatabase: {
    width: 400,
    height: 550,
  },
  MapFields: {
    width: 900,
    height: 600,
  },
};

export function updateWindowSize(page) {
  framer.showUI(pageSizes[page]);
}