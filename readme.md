# SequelORM

Extensible and powerful MySQL object-relational mapper with the right amout of ease-of-use.

## Quickstart guide
This should give you a short overview over some of the most used features of SequelORM and how it can be used.

### Connecting to a database
Creating a database connection is as easy as:

    var SequelORM  = require('sequel_orm');
    var db = new SequelORM({
      user:     'theuser',
      password: 'password',
      database: 'database_name'
    });

But the real connection will as soon be done as the first sql will be made.

### Creating a table
A table for a migration can be done like the following example:

    var dataTypes = SequelORM.dataTypes;
    db.createTable('products', function(table) {
      table.addColumn('title', dataTypes.VARCHAR({ length: 122 }));
      table.addColumn('dueDate', dataTypes.DATETIME());
      table.addColumn('numberThings', dataTypes.INT());
      table.addColumn('price', dataTypes.FLOAT());
      table.addColumn('active', dataTypes.BOOLEAN({ default: true }));
      table.addColumn('description',dataTypes.TEXT());
      table.addTimestamps(); // this adds a created_at and updated_at column to the table
    }, function(err) {
      if (err) throw err;
      // Here the table is already created
    });

Every predefined data type can has the following parameters: length (integer), default (String|Object), required (boolean), validation (Function|Array[function]).
The addTimestamps method will add two columns to the table which will be automatically filled when item is saved and is updated.

### Defining a model

### Creating a series of migration files

### Creating great middleare with hooks
- after create
- before and after changing a property
- before and after validate
- before and after save
- after loaded

Instance hooks:
- save

Instance hooks are used like a typical Node.js EventEmitter:

    var Thing  = SequelORM.getModel('Thing'),
        myFunc = function() { console.log('Yeah I was saved'); };
    Thing.on('save', myFunc);
    Thing.removeListener('save', myFunc);

### Using the models

You can find element from the database like that:

    var person = Person.find(3); // find with id
    // with where clause, and limit returning an array of projects
    var projects = Project.findAll({ where: 'title LIKE ?', limit: 5, offset: 10 }, 'create%');
    // creates a query like SELECT * FROM projects WHERE title LIKE 'create%' LIMIT 10,5

### Migrations

#### HasOne Associations
A hasOne association can be defined like the following example:

    // create the tables
    Seq.createTable('things', function(table) {
      table.addColumn('name', Seq.dataTypes.VARCHAR());
    });
    Seq.createTable('items', function(table) {
      table.addColumn('name', Seq.dataTypes.VARCHAR());
      table.addHasOneColumn('thing');
      table.addHasOneColumn('thing', { as: 'anotherThing' });
    });
    // define the models with hasOne
    var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
    var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
    Item.hasOne(Thing);
    Item.hasOne(Thing, { as: 'anotherThing' });

Done this, you can do the following things. Setting and Getting the things on an item:

    var thing1 = Thing.create({ name: "one" }),
        thing2 = Thing.create({ name: "two" }),
        item   = Item.create({ name: "an item" });
    item.setThing(thing1); // also possible: item.thing = thing1;
    item.setAnotherThing(thing2);
    item.getAnotherThing(function(theThing) { /* do stuff here */ });
    item.removeThing();

If you want to save the item, make sure that you will save the associated objects first, else save will return `AssociationsNotSavedError`.


## Things to be aware of
It uses the [node_mysql](https://github.com/felixge/node-mysql) module by [Felix Geisendörfer](https://github.com/felixge).

## Things that are still todo:

### Next thing:
- check that isDirty is false if setThing and removeThing is called and old state is set again

### v0.1:
- hasMany Associations
- hasMany with different name
- ManyToMany
- Check association validation before saving
- Check if record can be extracted as module from model.js
- this readme file with all stuff explained
- generated documentation
- chaining
- calc codecoverage
- fix Date locale problem and tests
- tests for setThing(thing) will change thing.item_id
- tests for setThings([thing]) will change thing.item_id and save that in db
- make sure we only save changed attributes into db

### v0.2:
- dont mark things as dirty if orignal state is met again
- dont save assocs that are already saved
- Only load some attributes of a record (maybe like in sequalize)
- TableMigrator should be able to create syncs and replace TableCreator and TableUpdater
- through associations
- data type ENUM
- associations with autosave?
- Item.getThings({ where: 'id>3', limit: 5 }, cb) should work
- Extract functionality for singular pluralize words and make them attributes, ids, or whatever

### later:
- get and validate hook, as second type of hooks?
- load element inclusive all associated elements
- create docs
- table.hasOne('OtherThing')
- COMMENTS in data types
- ZEROFILL numbers in data types
- autoincrement in database
- Database name inflection plural/singular using a dictionary
- transactions