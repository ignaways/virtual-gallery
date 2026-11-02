import { config } from "../config.js";
import { createBlobUploads } from "./blobUploads.js";
import { createLocalUploads } from "./localUploads.js";

export const createUploads = () => (config.blobToken ? createBlobUploads(config.blobToken) : createLocalUploads(config.dataDir));
