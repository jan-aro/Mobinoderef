const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

const BASE_URL = 'https://nwsapimobinodes.nowchain.info/api/v1';

const ACCOUNTS_FILE = 'accounts.json';
const PARENT_CODE_FILE = 'code.txt';
const PROXIES_FILE = 'proxies.txt';

function getParentCode() {
  try {
    if (fs.existsSync(PARENT_CODE_FILE)) {
      const code = fs.readFileSync(PARENT_CODE_FILE, 'utf8').trim();
      console.log(`Parent code loaded from ${PARENT_CODE_FILE}: ${code}`);
      return code;
    } else {
      console.error(`Parent code file ${PARENT_CODE_FILE} not found. Using default code.`);
      return 'V69VTPTB7BBN'; 
    }
  } catch (error) {
    console.error(`Error reading parent code: ${error.message}`);
    return 'V69VTPTB7BBN'; 
  }
}

function loadProxies() {
  try {
    if (fs.existsSync(PROXIES_FILE)) {
      const data = fs.readFileSync(PROXIES_FILE, 'utf8');
      const proxies = data.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      console.log(`Loaded ${proxies.length} proxies from ${PROXIES_FILE}`);
      return proxies;
    }
  } catch (error) {
    console.error(`Error loading proxies: ${error.message}`);
  }
  return [];
}

function createProxyAgent(proxyString) {
  if (!proxyString) return null;
  
  try {
    let proxyUrl;
    
    if (proxyString.includes('://')) {
      proxyUrl = proxyString;
    } else {
      const parts = proxyString.split(':');
      
      if (parts.length === 2) {
        proxyUrl = `http://${parts[0]}:${parts[1]}`;
      } else if (parts.length === 3) {
        const protocol = parts[2].toLowerCase();
        proxyUrl = `${protocol}://${parts[0]}:${parts[1]}`;
      } else if (parts.length === 5) {
        const protocol = parts[4].toLowerCase();
        proxyUrl = `${protocol}://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
      } else {
        throw new Error(`Invalid proxy format: ${proxyString}`);
      }
    }
    
    if (proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks5://')) {
      return new SocksProxyAgent(proxyUrl);
    } else {
      return new HttpsProxyAgent(proxyUrl);
    }
  } catch (error) {
    console.error(`Error creating proxy agent: ${error.message}`);
    return null;
  }
}

function generateDeviceCode() {
  return crypto.randomBytes(32).toString('hex');
}
function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading accounts: ${error.message}`);
  }
  return [];
}

function saveAccounts(accounts) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
    console.log(`Accounts saved to ${ACCOUNTS_FILE}`);
  } catch (error) {
    console.error(`Error saving accounts: ${error.message}`);
  }
}

async function createWallet(proxyAgent) {
  try {
    const deviceCode = generateDeviceCode();
    
    console.log(`Creating new wallet with device code: ${deviceCode}`);
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Dart/3.6 (dart:io)',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json'
      }
    };
    
    if (proxyAgent) {
      axiosConfig.httpsAgent = proxyAgent;
      console.log(`Using proxy for wallet creation`);
    }
    
    const response = await axios.post(`${BASE_URL}/user/account/create`, {
      device_code: deviceCode
    }, axiosConfig);
    
    if (response.data.status) {
      const accountData = response.data.data;
      console.log(`Wallet created successfully: ${accountData.wallet_address}`);
      
      accountData.device_code = deviceCode;
      
      return accountData;
    } else {
      console.error('Failed to create wallet:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error(`Error creating wallet: ${error.message}`);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return null;
  }
}

async function updateParent(privateKey, parentCode, proxyAgent) {
  try {
    console.log(`Updating parent code to: ${parentCode}`);
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Dart/3.6 (dart:io)',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json',
        'authorization': `Bearer ${privateKey}`
      }
    };
    
    if (proxyAgent) {
      axiosConfig.httpsAgent = proxyAgent;
    }
    
    const response = await axios.post(`${BASE_URL}/user/account/update-parent`, {
      parent_code: parentCode
    }, axiosConfig);
    
    if (response.data.status) {
      console.log('Parent code updated successfully');
      return true;
    } else {
      console.error('Failed to update parent code:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error(`Error updating parent code: ${error.message}`);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return false;
  }
}

async function completeTask(privateKey, taskId, proxyAgent) {
  try {
    console.log(`Completing task ID: ${taskId}`);
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Dart/3.6 (dart:io)',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json',
        'authorization': `Bearer ${privateKey}`
      }
    };
    
    if (proxyAgent) {
      axiosConfig.httpsAgent = proxyAgent;
    }
    
    const response = await axios.post(`${BASE_URL}/user/task/do`, {
      task_id: taskId
    }, axiosConfig);
    
    if (response.data.status) {
      console.log(`Task ${taskId} completed successfully`);
      return true;
    } else {
      console.error(`Failed to complete task ${taskId}:`, response.data.message);
      return false;
    }
  } catch (error) {
    console.error(`Error completing task ${taskId}: ${error.message}`);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return false;
  }
}

async function enableFreeEarning(privateKey, proxyAgent) {
  try {
    console.log('Enabling free earning...');
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Dart/3.6 (dart:io)',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json',
        'authorization': `Bearer ${privateKey}`
      }
    };
    
    if (proxyAgent) {
      axiosConfig.httpsAgent = proxyAgent;
    }
    
    const response = await axios.post(`${BASE_URL}/user/earn/pay-to-earn-free`, {}, axiosConfig);
    
    if (response.data.status) {
      console.log('Free earning enabled successfully');
      return true;
    } else {
      console.error('Failed to enable free earning:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error(`Error enabling free earning: ${error.message}`);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return false;
  }
}

async function startEarning(privateKey, deviceCode, proxyAgent) {
  try {
    console.log('Starting earning process...');
    
    const latitude = -6.214722 + (Math.random() - 0.5) * 0.01;
    const longitude = 106.8450013 + (Math.random() - 0.5) * 0.01;
    
    const deviceNames = ['SM-G950F', 'MI 9T', 'CPH1823', 'Redmi Note 8', 'Pixel 4a', 'iPhone12,1'];
    const deviceName = deviceNames[Math.floor(Math.random() * deviceNames.length)];
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Dart/3.6 (dart:io)',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json',
        'authorization': `Bearer ${privateKey}`
      }
    };
    
    if (proxyAgent) {
      axiosConfig.httpsAgent = proxyAgent;
    }
    
    const response = await axios.post(`${BASE_URL}/user/earn/start`, {
      earn_option_id: 1,
      device_name: deviceName,
      device_code: deviceCode,
      latitude: latitude,
      longitude: longitude
    }, axiosConfig);
    
    if (response.data.status) {
      console.log('Earning started successfully');
      return response.data.data;
    } else {
      console.error('Failed to start earning:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error(`Error starting earning: ${error.message}`);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return null;
  }
}

async function getAccountInfo(privateKey, proxyAgent) {
  try {
    console.log('Getting account information...');
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Dart/3.6 (dart:io)',
        'Accept-Encoding': 'gzip',
        'authorization': `Bearer ${privateKey}`
      }
    };
    
    if (proxyAgent) {
      axiosConfig.httpsAgent = proxyAgent;
    }
    
    const response = await axios.get(`${BASE_URL}/user/account/info`, axiosConfig);
    
    if (response.data.status) {
      console.log('Account information retrieved successfully');
      return response.data.data;
    } else {
      console.error('Failed to get account information:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error(`Error getting account information: ${error.message}`);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return null;
  }
}

function promptUserInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Enter the number of accounts to create: ', (answer) => {
      rl.close();
      const numAccounts = parseInt(answer);
      if (isNaN(numAccounts) || numAccounts <= 0) {
        console.log('Invalid input. Using default value of 1 account.');
        resolve(1);
      } else {
        resolve(numAccounts);
      }
    });
  });
}

async function main() {
  const numAccounts = await promptUserInput();
  console.log(`Will create ${numAccounts} accounts`);
  
  const parentCode = getParentCode();
  
  const proxies = loadProxies();
  
  const accounts = loadAccounts();
  console.log(`Loaded ${accounts.length} existing accounts`);
  
  for (let i = 0; i < numAccounts; i++) {
    console.log(`\n=== Creating account ${i + 1} of ${numAccounts} ===`);
    
    let proxyAgent = null;
    if (proxies.length > 0) {
      const proxyString = proxies[i % proxies.length];
      console.log(`Using proxy: ${proxyString}`);
      proxyAgent = createProxyAgent(proxyString);
    }
    
    const wallet = await createWallet(proxyAgent);
    if (!wallet) {
      console.error('Failed to create wallet, skipping to next account');
      continue;
    }
    
    await updateParent(wallet.private_key, parentCode, proxyAgent);
    
    const taskIds = [1, 2, 3, 4, 5, 42, 43];
    for (const taskId of taskIds) {
      await completeTask(wallet.private_key, taskId, proxyAgent);
    }
    
    await enableFreeEarning(wallet.private_key, proxyAgent);
    
    const earningData = await startEarning(wallet.private_key, wallet.device_code, proxyAgent);
    if (earningData) {
      wallet.earning = earningData;
    }
    
    const accountInfo = await getAccountInfo(wallet.private_key, proxyAgent);
    if (accountInfo) {
      wallet.updated_info = accountInfo;
    }
    
    accounts.push({
      ...wallet,
      created_at: new Date().toISOString()
    });
    
    saveAccounts(accounts);
    
    if (i < numAccounts - 1) {
      const delay = 3000 + Math.floor(Math.random() * 2000);
      console.log(`Waiting ${delay}ms before creating next account...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log(`\nCompleted! Created ${numAccounts} new accounts.`);
  console.log(`Total accounts: ${accounts.length}`);
}

main().catch(error => {
  console.error('Error in main process:', error);
  process.exit(1);
});