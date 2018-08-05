module.exports.getDate = () => {
  const year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  month = month > 9 ? month : `0${month}`;
  const day = new Date().getDate();
  const dateString = `${month}-${day}-${year}`;
  return dateString;
};
