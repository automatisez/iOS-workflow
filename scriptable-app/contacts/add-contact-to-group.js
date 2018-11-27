let text = {

  'error': {
    'fr-FR': "Erreur",
    '*':     "Error"
  },
  
  'error.noContactMatch': {
    'fr-FR': `Aucun contact correspondant n'a été trouvé dans le compte par défaut. 
              Avez-vous sélectionné un contact sans nom ou organisation ou votre compte par défault est-il différent de iCloud ?`,
    '*':     `No matching contact was found in the default contact account.
              Have you selected an account with at least a first name, last name or organization ou is your default
              account not the iCloud one?`
  },
  'error.multipleContactMatch': {
    'fr-FR': `Plusieurs contacts portent le même nom et prénom dans le compte par défaut.`,
    '*':     `Multiple contacts seems to share first name, last name and organization in the default contact account.`
  },
  'error.isDefaultICloud': {
    'fr-FR': `Erreur. Verifiez que votre compte par défault pour les contacts est bien iCloud.`,
    '*':     `Error. Please check default contact account is iCloud.`
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

// ===== ENTRY POINT

let allContact = [];

// We can be called from the share sheet or callback-url

if ( 0 === args.all.length ) {
  // CASE 1: no arguments from share sheet, check if we are called from XCallback URL
  allContact = buildInputFromCallbackURL();
}
else {
  // CASE 2: We were called from share sheet, just get the VCards and convert them to internal object
  allContact = buildInputFromShareSheet()
}

// Currently share sheet only provide a single contact, but just try to be safe 
// by looping on all items, just in case.
//
for ( contactProps of allContact ) {
  if ( null !== contactProps.org && ('' === contactProps.firstName) ) {
    // Error: Only Cie name, no family name we might not find proper contact
    // TODO: we shall expose tome error here
  }
  
  let contacts = await findContacts(contactProps);
  
  if ( contacts.length === 0 ) {
    // No match found
    let alert = createAlertDialog(
      text.i18n('error'), 
      text.i18n('error.noContactMatch'), 
      text.i18n('cancel')
    );
    alert.presentAlert();
  }
  else if ( contacts.length > 1 ) {
    // More than one match
    let alert = createAlertDialog(
      text.i18n('error'), 
      text.i18n('error.multipleContactMatch'), 
      text.i18n('cancel')
    );
    alert.presentAlert();
  }
  else {
    // Only one match
    let container = await ContactsContainer.default();
    
    let groupSelectedHandler = (group) => {
      console.log(`Group select: ${group}`);
      if ( null !== group ) {
        addContactToGroup(contacts[0], group, container);
      }
    };
    
    await selectContactGroup(container, groupSelectedHandler);
  }
}

// ===== INPUT HANDLING

/** Extract contact first name/last name from input and build a contact summary.
 * 
 * We expect to have two parameters from URL:
 * - `fn` for base64-encoded firstname
 * - `ln` for base64-encoded lastname
 * - `o`  for base64-encoded organization name
 */
function buildInputFromCallbackURL() {
  let params = URLScheme.allParameters();
  
  let lastnameB64  = params["ln"];
  let firstnameB64 = params["fn"];
  let orgB64       = params["o"];
  
  // We do not use this
  // let baseURL = params["x-success"]
  
  let lastnameData  = Data.fromBase64String(lastnameB64);
  let firstnameData = Data.fromBase64String(firstnameB64);
  let orgData       = Data.fromBase64String(orgB64);
  
  let lastname  = lastnameData.toRawString();
  let firstname = firstnameData.toRawString();
  let org       = org.toRawString();
  
  console.log(`Importing contact:\n${firstname} ${lastname} - ORG: ${org}`);
  
  let contact = ContactProp();
  contact.firstName = firstname;
  contact.lastName  = lastname;
  contact.org       = org;
  
  return [ contact ];
}


/** Extract contact first/last nam from argument list provided by share sheet
 */
function buildInputFromShareSheet() {
  return args.plainTexts.map((arg) => {
    return getContactFromVCard(arg);
  });
}


// ===== CONTACT INTERACTION

/** Internal contact summary object.
 */
function ContactProp() {
  let contact = {
    org: null, // Not provided in Contact object
    fn:  null, // Full display name, formatted for display
    firstName: '',
    lastName: ''
  };
  
  return contact;
};


/** As share sheet provide a simple VCard we have to find matching contact ourselves.
 *
 * Without internal Contact.id property value we have to make a guess 
 * on the matching contact.
 *
 * This function just parses VCard to get main identification properties. 
 */
function getContactFromVCard(text) {
  let contact = ContactProp();
  
  let singleValueRE = /^(FN|ORG):([^;]+);?$/i;
  let namesRE = /^N:(.+)$/i;
  let lines = text.split(/\r\n|\r|\n/);
  
   lines.forEach((line) => {
     if ( singleValueRE.test(line) ) {
       let matches = line.match(singleValueRE);
       let key   = matches[1].toLowerCase().trim();
       let value = matches[2].trim();
       
       contact[key] = value;
     }
     else if ( namesRE.test(line) ) {
       let matches = line.match(namesRE);
       let parts = matches[1].split(';');
       let lastName  = parts[0].trim();
       let firstName = parts[1].trim();
       
       contact['firstName'] = firstName;
       contact['lastName']  = lastName;
     }
   });
  
  return contact;  
}


/** Using core contact properties try to find matching contact.
 */
async function findContacts(props) {
  let container = await ContactsContainer.default();
  let allContacts = await Contact.all([ container ]); 
  
  let matches = allContacts.filter((current) => {
    let familyName = ( current.familyName )       ? current.familyName.trim() : '';
    let givenName  = ( current.givenName )        ? current.givenName.trim()  : '';
    let orgName    = ( current.organizationName ) ? current.organizationName.trim()  : '';
    
    let sameFamilyName = 0 === props.lastName.localeCompare(familyName);
    let sameGivenName  = 0 === props.firstName.localeCompare(givenName);
    let sameOrgName    = 0 === props.org.localeCompare(orgName);
    
    let isMatching = sameFamilyName && sameGivenName && sameOrgName;
    
    return isMatching;
  });
  
  return matches;
}


// ===== UI UTILITIES

/** Create a simple alert dialog.
 */
function createAlertDialog(title, message, cancelLabel) {
  let dialog = new Alert();
  
  dialog.title = title;
  dialog.message = message;
  
  dialog.addCancelAction(cancelLabel);
  
  return dialog;
}


// ===== TABLE OF GROUPS

/** Create a simple UITableRow for a group
 *
 * @param group 
 *        ContactsGroup object
 * @param selectFn 
 *        Function to call when group is selected `(group: ContactsGroup) => { ... }`
 */
async function createGroupRow(group, selectFn) { 
  let row = new UITableRow();
  row.height = 50;

  let members = await Contact.inGroups([group]);
  
  let nameCell = UITableCell.text(group.name);
  nameCell.leftAligned();
  
  let countCell = UITableCell.text(`${ members.length } contacts`)
  countCell.rightAligned();
  
  row.addCell(nameCell);
  row.addCell(countCell);

  row.onSelect = selectFn;
  
  return row;
}


/** Build a UITable to present a list of ContactsGroup.
 */
async function createGroupTable(groups, selectFn) {
  let table = new UITable();
  
  for ( group of groups ) {
    let row = await createGroupRow(group, selectFn);
    table.addRow(row);
  }
  
  return table;
}


// ===== CONTACT GROUP UTILITY

/** Order an array of ContactsGroup by their name.
 */
function orderGroups(groups) {
  groups.sort(
    (g1, g2) => { return g1.name.localeCompare(g2.name); }
  );
  
  return groups;
}


/** Show a list of groups and ask user to select one
 *
 * @param container
 *        The ContactsContainer that groups are part of.
 * @param selectedFn
 *.       Function that will be called when a group gets selected.
 *.       This function accepts a single ContactsGroup parameter.
 */
async function selectContactGroup(container, selectedFn) {
  let allGroups = await ContactsGroup.all([ container ]);
  
  let orderedGroups = orderGroups(allGroups);
  
  // We build a small function to map row number to group object
  // as this is the kind of parameter expected by the selectedFn parameter.
  let groupSelectionHandler = (index) => {
    let group = orderedGroups[index];
    selectedFn(group);
  };
  
  let groupTable = await createGroupTable(orderedGroups, groupSelectionHandler);
  
  groupTable.present();
}


/** Add the specified contact to the specified group.
 *
 * @param contact: Contact
 * @param group: ContactsGroup
 * @param container: ContactsGroup
 */
function addContactToGroup(contact, group, container) {
  group.addMember(contact)
  
  Contact.persistChanges()
  .then((data) => {
    console.log(`Contact ${ contact.familyName } added to group ${ group.name }.`); 
    Script.complete();
  })
  .catch((error) => {
    console.log(`Failed to add contact to group. ${error}`);
    let alert = createAlertDialog(text.i18n('error'), text.i18n('error.isDefaultICloud'), text.i18n('ok'));

    alert.present().then(
      () => { Script.complete(); }, 
      () => { Script.complete(); }
    );
  });
}


