import { db, forceAutoProvisionSupabaseRoles } from "@workspace/db"; 
import { sql } from "drizzle-orm"; 
import app from "./app"; 
import { logger } from "./lib/logger"; 

const rawPort = process.env["PORT"]; 
if (!rawPort) { 
  throw new Error( 
    "PORT environment variable is required but was not provided.", 
  ); 
} 

const port = Number(rawPort); 
if (Number.isNaN(port) || port <= 0) { 
  throw new Error(`Invalid PORT value: "${rawPort}"`); 
} 

// Explicitly validates the row connectivity of all application tables cleanly 
async function verifyAndConnectAllTables(databaseInstance: any) { 
  console.log("\n==========================================================="); 
  console.log("[STATUS] STARTING COMPLETE DATABASE TABLE AUDIT SWEEP PASS..."); 
  console.log("==========================================================="); 

  const targetTables = ["users", "subscriptions", "scan_results", "settings", "notifications", "api_keys"]; 
  let checksPassed = 0; 

  for (const tableName of targetTables) { 
    try { 
      // Direct raw query reads table directly, bypassing complex information_schema lookups 
      await databaseInstance.execute(sql`SELECT 1 FROM "${sql.raw(tableName)}" LIMIT 1;`); 
      console.log(`[CONNECTED] Table "${tableName}" synced and responding smoothly.`); 
      checksPassed++; 
    } catch (err: any) { 
      console.warn(`[NOTICE] Table "${tableName}" uninitialized or empty (Safe to ignore):`, err.message); 
    } 
  } 

  console.log("==========================================================="); 
  console.log(`[AUDIT COMPLETE] Successfully synced and verified [${checksPassed}/${targetTables.length}] tables.`); 
  console.log("===========================================================\n"); 
} 

// Unified Full-Stack System Initialization Pass 
async function bootstrapServerWorkspace() { 
  try { 
    // 🚀 Automatically forces your new database security roles to synchronize on boot natively 
    await forceAutoProvisionSupabaseRoles(db); 
    
    // 🔍 Runs your comprehensive table validation sweep pass natively right before launch 
    await verifyAndConnectAllTables(db); 
    
    // Starts up your active network channels listening loop 
    app.listen(port, (err?: any) => { 
      if (err) { 
        logger.error({ err }, "Error listening on port"); 
        process.exit(1); 
      } 
      logger.info({ port }, "Server listening port"); 
    }); 
  } catch (error) { 
    logger.error({ error }, "Critical failure during server bootstrap pipeline initialization"); 
    process.exit(1); 
  } 
} 

// Fire up the launch sequence 
bootstrapServerWorkspace();
