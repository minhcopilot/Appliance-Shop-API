import { ObjectId } from 'mongodb';
import { Schema, model } from 'mongoose';
import * as yup from 'yup';

const postCategorySchema = yup.object().shape({
  name: yup.string().required().max(100),
  description: yup.string().max(500),
  parentId: yup
    .string()
    .nullable()
    .test('Validate ObjectId', '$path is not a valid ObjectId', async (value: any) => {
      return ObjectId.isValid(value);
    }),
  coverImageUrl: yup.string().max(500),
  isDeleted: yup.boolean().default(false),
  createdBy: yup.string().required().max(100),
  updatedBy: yup.string().max(100),
});

interface PostCategory extends Omit<yup.InferType<typeof postCategorySchema>, 'parentId'> {
  parentId: ObjectId;
}

const postCategoryDbSchema = new Schema<PostCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxLength: 500,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'PostCategory',
    },
    coverImageUrl: {
      type: String,
      maxLength: 500,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      required: true,
      maxLength: 100,
    },
    updatedBy: {
      type: String,
      maxLength: 100,
    },
  },
  { versionKey: false, timestamps: true },
);
export const PostCategory = model('PostCategory', postCategoryDbSchema);
