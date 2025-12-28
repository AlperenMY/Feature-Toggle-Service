import { Client } from "@elastic/elasticsearch";
import { config } from "./config";

export const es = new Client({ node: config.elasticUrl });
