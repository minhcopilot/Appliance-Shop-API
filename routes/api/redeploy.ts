import { exec } from 'child_process';
import express from 'express';

const redployRouter = express.Router();

var yourscript = () => {
  exec('sh redeploy.sh', (error, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
  });
};

redployRouter.get('/', async (req: any, res: any, next: any) => {
  try {
    yourscript();
    return res.json({ message: 'Redploy success' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

export default redployRouter;
