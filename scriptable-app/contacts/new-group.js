function createTextPrompDialog(title, message, fieldLabel, fieldDefault, cancelLabel, actionLabel) {
  let dialog = new Alert();
  
  dialog.title = title;
  dialog.message = message;
  
  dialog.addTextField(fieldLabel, fieldDefault);
  dialog.addAction(actionLabel);
  dialog.addCancelAction(cancelLabel);
  
  return dialog;
}

function createAlertDialog(title, message, cancelLabel) {
  let dialog = new Alert();
  
  dialog.title = title;
  dialog.message = message;
  
  dialog.addCancelAction(cancelLabel);
  
  return dialog;
}

/** Prompt user with an alert asking for new group name.
 *
 * If user's select the cancel option, the null value will be returned.
 * 
 * If user confirms, the group name will be returned.
 */
async function askForGroupName() {
  let dialog = createTextPrompDialog(
    "Nouveau groupe", 
    "Donnez un nom au groupe que vous voulez créer avec ce contact.", 
    "nom de groupe", 
    "mongroupe", 
    "Annuler", 
    "Créer un groupe"
    );
  
  let groupName = null; 
  let response = await dialog.present();
  
  if ( response >= 0 ) {
    groupName = dialog.textFieldValue(0);
  }
  
  return groupName;
};


/** Create a group with single member in the specified container.
 */
function createGroup(container, groupName) {
  let group = new ContactsGroup();
  group.name = groupName;
  
  ContactsGroup.add(group, container.identifier);  
  Contact.persistChanges()
  .then((data) => {
    console.log(`Group created successfully: ${ group.name }`);
  })
  .catch((error) => {
    console.log(`Failed to create group ${error}`);
    let alert = createAlertDialog("Erreur", "Erreur. Verifiez que votre compte par défault pour les contacts est bien iCloud.", "OK")
    alert.present();
  });

  return group;
}


let groupName = await askForGroupName();

if ( null !== groupName ) {
  let group = createGroup(ContactsContainer.default(), groupName);
}
