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


// ===== GROUP TABLE UTILITIES


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


// ===== GROUP MEMBER TABLE UTILITIES

/** Simple class to wrap a contact and manage their group membership.
 */
function GroupMember(group, contact) {
  let member = {
    group: group,
    contact: contact,
    isMember: true
  };
  
  return member;
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


/** Order an array of ContactsGroup by their name.
 */
function orderContacts(contacts) {
  contacts.sort(
    (c1, c2) => { return c1.familyName.localeCompare(c2.familyName); }
  );
  
  return contacts;
}


// ===== CONTACT INTERACTION


/** Build and present a list of group to select the one to manage.
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



// -----


let container = await ContactsContainer.default();
    
async function groupSelected(group) {
  if ( null !== group ) {
    console.log(`Group: ${group.name}`);
    let members = await Contact.inGroups([ group ]);
    let orderedMembers = orderContacts(members);
    
    console.log(
      orderedMembers.map(
        (c) => { return `${c.familyName} ${c.givenName}`; }
      )
    );
    
    manageGroupMembers(container, group, members);
  }
};
    
await selectContactGroup(container, groupSelected);


// ----- 


/** Build and present a list of group members and allow on-the-fly membership management.
 */
async function manageGroupMembers(container, group, contacts) {
  let memberList = contacts.map(
    (contact) => { return GroupMember(group, contact); }
  );
  
  // Change membership on the fly
  let selectHandler = (member, complete) => {
    if ( member.isMember ) {
      console.log('will remove');
      removeContactFromGroup(member.contact, group, () => { 
        member.isMember = false; 
        console.log(`did remove ${member}`);
        complete();
      });
    }
    else {
      console.log('will add');
      addContactToGroup(member.contact, group, () => { 
        console.log('did add');
        member.isMember = true; 
        complete();
      });
    }
  };
  
  let table = await createMembersTable(memberList, selectHandler);
  table.present();
}


/** Build a UITable to present a list of ContactsGroup.
 */
async function createMembersTable(members, selectFn) {
  let table = new UITable();
  
  let selectedFn = (rowIndex) => {
    let member = members[rowIndex];
    console.log(`@${rowIndex}: `);
    
    console.log('Calling handler...');
    selectFn(member, () => { 
      console.log('Reloading...');
      refreshMembersTable(table, members, selectedFn);
    });
  };
  
  await refreshMembersTable(table, members, selectedFn);
  
  return table;
}


async function refreshMembersTable(table, members, selectedFn) {
  table.removeAllRows();
  
  for ( member of members ) {
    let row = await createMemberRow(member, selectedFn);
    table.addRow(row);
  }
  
  table.reload();
}



async function createMemberRow(member, selectFn) { 
  let row = new UITableRow();
  row.height = 50;

  let name = `${ member.contact.familyName } ${ member.contact.givenName }`;
  let nameCell = UITableCell.text(name);
  nameCell.leftAligned();
  
  let action = ( member.isMember ) ? "✅ Enlever" : "🔙 Remettre";
  let actionCell = UITableCell.button(action);
  
  row.addCell(nameCell);
  row.addCell(actionCell);

  row.onSelect = selectFn;
  row.dismissOnSelect = false;
  
  return row;
}



/** Remove contact from the group and apply change to the store.
 */
function removeContactFromGroup(contact, group, complete) {
  group.removeMember(contact);
  
  Contact.persistChanges()
  .then((data) => {
    complete();
    console.log(`Contact ${ contact.familyName } removed from group ${ group.name }.`); 
  })
  .catch((error) => {
    console.log(`Failed to remove contact from group. ${error}`);
    let alert = createAlertDialog("Erreur", "Impossible de retirer du groupe. Vérifiez que votre compte par défault pour les contacts est bien iCloud.", "OK")
    alert.present();
  });
}


function addContactToGroup(contact, group, complete) {
  group.addMember(contact)
  
  Contact.persistChanges()
  .then((data) => {
    complete();
    console.log(`Contact ${ contact.familyName } added to group ${ group.name }.`); 
  })
  .catch((error) => {
    console.log(`Failed to add contact to group. ${error}`);
    let alert = createAlertDialog("Erreur", "Erreur. Verifiez que votre compte par défault pour les contacts est bien iCloud.", "OK")
    alert.present();
  });
}

