let text = {
  'error': {
    'fr-FR': "Erreur",
    '*':     "Error"
  },

  'error.isDefaultICloud': {
    'fr-FR': `Erreur. Verifiez que votre compte par défault pour les contacts est bien iCloud.`,
    '*':     `Error. Please check default contact account is iCloud.`
  },
  
  'dialog.newGroup.title': {
    'fr-FR': 'Nouveau groupe',
    '*':     ''
  },
  'dialog.newGroup.msg': {
    'fr-FR': 'Donnez un nom au groupe que vous voulez créer avec ce contact.',
    '*':     ''
  },
  'dialog.newGroup.field.label': {
    'fr-FR': 'Nom de groupe',
    '*':     ''
  },
  'dialog.newGroup.field.default': {
    'fr-FR': 'mongroupe',
    '*':     ''
  },
  'dialog.newGroup.action.label': {
    'fr-FR': 'Créer un groupe',
    '*':     ''
  },
    
  'ok': {
    'fr-FR': "OK",
    '*':     "OK"
  },
  'cancel': {
    'fr-FR': "Annuler",
    '*':     "Cancel"
  },

  // Use this as a template for localization
  '__': {
    'fr-FR': "",
    '*':     ""
  }
};

// ===== UI UTILITIES

Object.prototype.i18n = function (key) {
  let langs = Device.preferredLanguages();
  langs.push('*');
  
  if ( 'undefined' === typeof this[key] ) {
    console.log(`Missing key ${key}`);
    Script.complete();
  }
  
  let msg;
  while ( 'undefined' === typeof msg && (langs.length > 0) ) {
    msg = this[key][langs.shift()];
  }
  
  return msg;
};


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


// =====

    
/** Prompt user with an alert asking for new group name.
 *
 * If user's select the cancel option, the null value will be returned.
 * 
 * If user confirms, the group name will be returned.
 */
async function askForGroupName() {
  let dialog = createTextPrompDialog(
    text.i18n('dialog.newGroup.title'),
    text.i18n('dialog.newGroup.msg'),
    text.i18n('dialog.newGroup.field.label'),
    text.i18n('dialog.newGroup.field.default'),
    text.i18n('cancel'),
    text.i18n('dialog.newGroup.action.label')
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
    
    let alert = createAlertDialog(
      text.i18n('error'),
      text.i18n('error.isDefaultICloud'),
      text.i18n('ok')
    );
    alert.present();
  });

  return group;
}


let groupName = await askForGroupName();

if ( null !== groupName ) {
  let group = createGroup(ContactsContainer.default(), groupName);
}
