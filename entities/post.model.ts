import { ObjectId } from 'mongodb';
import { Schema, model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as yup from 'yup';

const imageUrlSchema = yup.object().shape({
  url: yup.string().required(),
  publicId: yup.string().required(),
  name: yup.string().required(),
  size: yup.number().required(),
});

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
  authorId: yup.number(),
  authorName: yup.string().max(100),
  url: yup.string().max(500),
  imageUrl: imageUrlSchema,
  status: yup.string().max(20).oneOf(['draft', 'published', 'deleted']).default('draft'),
  commentStatus: yup.string().max(20).oneOf(['open', 'closed']).default('open'),
  like: yup.number().default(0),
  updateBy: yup.string().max(100),
});

interface Post extends Omit<yup.InferType<typeof postSchema>, 'postCategoryId'> {
  postCategoryId: ObjectId;
}

const imageUrlDbSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
});

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
      default: 0,
    },
    authorName: {
      type: String,
      required: true,
      maxLength: 100,
      default: 'Anonymous',
    },
    url: {
      type: String,
      required: true,
      maxLength: 500,
      unique: true,
    },
    imageUrl: imageUrlDbSchema,
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
    like: {
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
postDbSchema.virtual('category', {
  ref: 'PostCategory',
  localField: 'postCategoryId',
  foreignField: '_id',
  justOne: true,
});
postDbSchema.plugin(mongooseLeanVirtuals);
postDbSchema.set('toObject', { virtuals: true });
postDbSchema.set('toJSON', { virtuals: true });

export const Post = model('Post', postDbSchema);
