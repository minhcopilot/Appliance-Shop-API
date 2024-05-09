export const stripTags = (original: string) => {
  return original.replace(/<[^>]+>/g, '');
};

export const stripContent = (content: string) => {
  if (content.length <= 100) return content;
  return content.substring(0, content.lastIndexOf(' ', 100));
};
