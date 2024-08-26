import { framer } from "framer-plugin";

const pageSizes = {
  Integrations: {
    width: 450,
    height: 350,
  },
  Authenticate: {
    width: 350,
    height: 350,
  },
  SelectDatabase: {
    width: 750,
    height: 550,
  },
  MapFields: {
    width: 750,
    height: 550,
  },
};

export function updateWindowSize(page) {
  framer.showUI(pageSizes[page]);
}