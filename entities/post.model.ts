import { ObjectId } from 'mongodb';
import { Schema, model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as yup from 'yup';

export const postSchema = yup.object().shape({
  type: yup.string().required().max(20).oneOf(['post', 'page']).default('post'),
  postCategoryId: yup
    .string()
    .nullable()
    .test('Validate ObjectId', '$path is not a valid ObjectId', async (value: any) => {
      if (!value) return true;
      return ObjectId.isValid(value);
    }),
  title: yup.string().required().max(100),
  content: yup.string().required(),
  authorId: yup.number().required(),
  authorName: yup.string().required().max(100),
  url: yup.string().max(500),
  imageUrl: yup.string().max(500),
  status: yup.string().max(20).oneOf(['draft', 'published', 'deleted']).default('draft'),
  commentStatus: yup.string().max(20).oneOf(['open', 'closed']).default('open'),
  Like: yup.number().default(0),
  updateBy: yup.string().max(100),
});

interface Post extends Omit<yup.InferType<typeof postSchema>, 'postCategoryId'> {
  postCategoryId: ObjectId;
}

const postDbSchema = new Schema<Post>(
  {
    type: {
      type: String,
      required: true,
      maxLength: 20,
      enum: ['post', 'page'],
      default: 'post',
    },
    postCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'PostCategory',
    },
    title: {
      type: String,
      required: true,
      maxLength: 100,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    authorId: {
      type: Number,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
      maxLength: 100,
    },
    url: {
      type: String,
      required: true,
      maxLength: 500,
      unique: true,
    },
    imageUrl: {
      type: String,
      maxLength: 500,
    },
    status: {
      type: String,
      required: true,
      maxLength: 20,
      enum: ['draft', 'published', 'deleted'],
      default: 'draft',
    },
    commentStatus: {
      type: String,
      required: true,
      maxLength: 20,
      enum: ['open', 'closed'],
      default: 'open',
    },
    Like: {
      type: Number,
      default: 0,
    },
    updateBy: {
      type: String,
      maxLength: 100,
    },
  },
  { versionKey: false, timestamps: true },
);

postDbSchema.virtual('commentsCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
  count: true,
});
postDbSchema.plugin(mongooseLeanVirtuals);
postDbSchema.set('toObject', { virtuals: true });
postDbSchema.set('toJSON', { virtuals: true });

export const Post = model('Post', postDbSchema);
