import { createContext, useContext } from "react";

/** online: apakah backend terhubung; upload(blob, nama) → URL file di server */
export const ServerContext = createContext({ online: false, upload: async () => { throw new Error("Server not connected"); } });
export const useServer = () => useContext(ServerContext);
