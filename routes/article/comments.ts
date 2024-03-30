import express, { NextFunction, Request, Response } from 'express';
import { validateSchemaByField } from '../../utils/validateSchema';
import { Comment, commentSchema } from '../../entities/comment.model';
export const CommentsRouter = express.Router();

CommentsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  let inputError = [];
  for (const key in req.body) {
    if (key in commentSchema.fields) {
      try {
        await validateSchemaByField(commentSchema, req.body, key);
      } catch (error: any) {
        inputError.push(error.errors);
      }
    }
  }
  if (inputError.length > 0) {
    return res.status(400).json({ message: inputError.toString() });
  }
  try {
    let idData = await Comment.findByIdAndUpdate(id, req.body);
    if (idData) {
      return res.json({ message: `Comment updated successfully` });
    } else res.status(404).json({ message: `Couldn't find that comment` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});

CommentsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    let idData = await Comment.findByIdAndDelete(id);
    idData ? res.json({ message: 'Comment deleted successfully' }) : res.status(404).json({ message: `Couldn't find that comment` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});
