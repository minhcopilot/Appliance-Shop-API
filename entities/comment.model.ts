import { ObjectId } from 'mongodb';
import { Schema, model } from 'mongoose';
import * as yup from 'yup';

export const commentSchema = yup.object().shape({
  postId: yup
    .string()
    .required()
    .test('Validate ObjectId', '$path is not a valid ObjectId', async (value: any) => {
      return ObjectId.isValid(value);
    }),
  author: yup.string().required().max(100),
  email: yup.string().required().max(100),
  content: yup.string().required(),
  status: yup.string().required().max(20).oneOf(['approved', 'pending', 'spam']).default('pending'),
});

//Use the Omit helper type to exclude the postId property from the commentSchema
interface Comment extends Omit<yup.InferType<typeof commentSchema>, 'postId'> {
  postId: ObjectId;
}

const commentDbSchema = new Schema<Comment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    author: {
      type: String,
      required: true,
      maxLength: 100,
    },
    email: {
      type: String,
      required: true,
      maxLength: 100,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      maxLength: 20,
      enum: ['approved', 'pending', 'spam'],
      default: 'pending',
    },
  },
  { versionKey: false, timestamps: true },
);

export const Comment = model('Comment', commentDbSchema);
