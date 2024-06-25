import { exec } from 'child_process';
import express from 'express';

const redployRouter = express.Router();

var apiRedeploy = () => {
  exec('sh redeploy.sh', (error, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
  });
};

var userRedeploy = () => {
  exec('sh redeploy-user.sh', (error, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
  });
};

var adminRedeploy = () => {
  exec('sh redeploy-admin.sh', (error, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
  });
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
