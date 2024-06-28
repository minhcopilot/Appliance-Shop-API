import axios from 'axios';
import { exec } from 'child_process';
import express from 'express';
import md5 from 'md5';

const redployRouter = express.Router();

const redeployData = (projectName: string) => {
  const d = new Date();
  let now_time = d.getTime();
  const form = new FormData();
  form.append('request_token', md5(now_time + '' + md5(process.env.BT_KEY || '')));
  form.append('request_time', now_time.toString());
  form.append('data', `{"project_name":"${projectName}"}`);
  return form;
};

const nodejsRestartUrl = process.env.RESTART_URL;

const execHandler = (error: any, stdout: any, stderr: any) => {
  console.log(stdout);
  if (error || stderr) {
    console.log(error || stderr);
    throw error || stderr;
  }
};

const adminRedeploy = async () => {
  await exec('sh redeploy-admin.sh', execHandler);
};

redployRouter.get('/api', async (req: any, res: any, next: any) => {
  try {
    await exec('sh redeploy.sh', execHandler);
    console.log('Restarting api project');
    res.json({ message: 'Redploy success' });
    axios.post(nodejsRestartUrl, redeployData('appliance_shop_api'), { headers: { 'Content-Type': 'multipart/form-data' } });
  } catch (error: any) {
    console.log(error);
  }
});
redployRouter.post('/api', async (req: any, res: any, next: any) => {
  try {
    await exec('sh redeploy.sh', execHandler);
    console.log('Restarting api project');
    res.json({ message: 'Redploy success' });
    axios.post(nodejsRestartUrl, redeployData('appliance_shop_api'), { headers: { 'Content-Type': 'multipart/form-data' } });
  } catch (error: any) {
    console.log(error);
  }
});
redployRouter.get('/user', async (req: any, res: any, next: any) => {
  try {
    await exec('sh redeploy-user.sh', execHandler);
    console.log('Restarting user project');
    res.json({ message: 'Redploy success' });
    axios.post(nodejsRestartUrl, redeployData('appliance_shop_user'), { headers: { 'Content-Type': 'multipart/form-data' } });
  } catch (error: any) {
    console.log(error);
  }
});
redployRouter.post('/user', async (req: any, res: any, next: any) => {
  try {
    await exec('sh redeploy-user.sh', execHandler);
    console.log('Restarting user project');
    res.json({ message: 'Redploy success' });
    axios.post(nodejsRestartUrl, redeployData('appliance_shop_user'), { headers: { 'Content-Type': 'multipart/form-data' } });
  } catch (error: any) {
    console.log(error);
  }
});
redployRouter.get('/admin', async (req: any, res: any, next: any) => {
  try {
    await adminRedeploy();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
redployRouter.post('/admin', async (req: any, res: any, next: any) => {
  try {
    await adminRedeploy();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

export default redployRouter;
