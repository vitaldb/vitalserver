const file_folder = "Z:/";
const hospcode = "";

function get_file_folder(){
  if(file_folder.slice(-1) !== "/") return file_folder + "/";
  return file_folder;
}

module.exports = {
  hospcode : hospcode,
  get_file_folder : get_file_folder,
};
