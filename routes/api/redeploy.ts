import axios from 'axios';
import { exec } from 'child_process';
import express from 'express';
import { createHash } from 'node:crypto';

export const md5 = (content: string) => {
  return createHash('md5').update(content).digest('hex');
};

const redployRouter = express.Router();

const redeployData = (projectName: string) => {
  const d = new Date();
  let now_time = d.getTime();
  let p_data = {
    request_token: md5(now_time + '' + md5(process.env.bt_key)),
    request_time: now_time,
    data: {
      project_name: projectName,
    },
  };
  return p_data;
};
const nodejsRestartUrl = process.env.RESTART_URL;

const execHandler = async (error: any, stdout: any, stderr: any) => {
  for await (const data of stdout) {
    console.log(data);
  }
  if (error || stderr) {
    console.log(error || stderr);
    throw error || stderr;
  }
};

var apiRedeploy = async () => {
  await exec('sh redeploy.sh', execHandler);
  axios.post(nodejsRestartUrl, redeployData('appliance_shop_api'));
};

var userRedeploy = async () => {
  await exec('sh redeploy-user.sh', execHandler);
  axios.post(nodejsRestartUrl, redeployData('appliance_shop_user'));
};

var adminRedeploy = () => {
  exec('sh redeploy-admin.sh', execHandler);
};

redployRouter.get('/api', async (req: any, res: any, next: any) => {
  try {
    apiRedeploy();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
redployRouter.post('/api', async (req: any, res: any, next: any) => {
  try {
    apiRedeploy();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
redployRouter.get('/user', async (req: any, res: any, next: any) => {
  try {
    userRedeploy();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
redployRouter.post('/user', async (req: any, res: any, next: any) => {
  try {
    userRedeploy();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
redployRouter.get('/admin', async (req: any, res: any, next: any) => {
  try {
    adminRedeploy();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
redployRouter.post('/admin', async (req: any, res: any, next: any) => {
  try {
    adminRedeploy();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

export default redployRouter;
