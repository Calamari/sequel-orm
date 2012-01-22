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
Defining a model can be done in different ways. The easiest ist the following one:

    var Pruduct = Seq.defineModel('Pruduct', {
      title: Seq.dataTypes.VARCHAR({ length: 122 }),
      price: Seq.dataTypes.INT(),
      createdAt: Seq.dataTypes.DATETIME(),
      updatedAt: Seq.dataTypes.DATETIME()
    });

In this method we are explicit what attributes the defined model will have. Another way of doing the same is to defined it through a migration on the SequelORM object.

    SequelORM.createTable('products', function(table) {
      table.addColumn('title', dataTypes.VARCHAR({ length: 122 }));
      table.addColumn('price', dataTypes.FLOAT());
      table.addTimestamps(); // this adds a created_at and updated_at column to the table
    });
    var Product = SequelORM.defineModel('Product', SequelORM.getTableFromMigration('products'));

Calling createTable on the SequelORM object directly will not do anything on the database and therefore runs synchronously and does not need a callback method.

The thrid parameter of the defineModel method is an object which can take one or more of the following keys:

- *instanceMethods:* Methods that can be directly called on every instanciated Record object
- *classMethods:* Methods that can be called on the Model object itself
- *hooks:* Methods that will be called on several points in the lifetime of an object. (See the hooks section below for more information.)

Wanna an example? Take this:

    var Product = SequelORM.defineModel('Product', SequelORM.getTableFromMigration('products'), {
      instanceMethods: {
        doublePrice: function() {
          this.price *= 2;
        }
      },
      classMethods: {
        findCheapProducts: function(cb) {
          this.findAll({ where: 'products.price < 5' }, cb);
        }
      },
      hooks: {
        afterLoad: function() {
          this.price += 5;
        },
        afterChange: function(key, value) {
          if (key === 'title') {
            this.title = 'Awesome product:' + this.title;
          }
        }
      }
    });


### Creating a series of migration files

### Creating great middleare with hooks
There are two types of hooks: *model hooks* which will be defined on the model itself and are called on every instance of this model and *instance hooks* which will only be defined on that instance just like an EventEmitter. 

#### Model hooks:
The following model hooks are available:

- *afterCreate(data):* Called directly after a new record was created (not loaded from db). First parameter is object with defined data.
- *afterLoad(data):* Called after a record was loaded from db. First parameter is object with loaded data for this record.
- *beforeChange(key, value):* Called before an property of the instance is changed.
- *afterChange(key, value):* Called directly after an property of the instance is changed.
- *beforeValidate():* Called before the instance gets validated. (Usually directly before save.)
- *afterValidate(isValidated):* Called after all validators of instance has been run. First parameter is a boolean telling if the validations did run successfully or not.
- *beforeSave():* Called before an record gets saved into db.
- *afterSave():* Called before an record did get saved successfully into db.

#### Instance hooks:
At the moment there is only one instance hook available:

- *save:* called after record was saved into db

Instance hooks are used like a typical Node.js EventEmitter. So the methods on, once, removeListener, etc. are all available.

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

### v0.1:
- hasMany with different name
- Check if record can be extracted as module from model.js
- this readme file with all stuff explained
- generated documentation
- chaining (of save, add and set methods...)
- calc codecoverage?
- fix Date locale problem and tests
- make sure we only save changed attributes into db
- take care of default value WHERE to set it?

### v0.2:
- dont mark things as dirty if orignal state is met again
- dont save assocs that are already saved
- Only load some attributes of a record (maybe like in sequalize)
- TableMigrator should be able to create syncs and replace TableCreator and TableUpdater
- through associations
- data type ENUM
- associations with autosave?
- Check association validation before saving? (after previous one)
- Item.getThings({ where: 'id>3', limit: 5 }, cb) should work
- Extract functionality for singular pluralize words and make them attributes, ids, or whatever
- Change findAllAsHash to findAll({ hash: true }) and remove findAllAsHash
- association validation
- Thing.findAll({ where: 'things.id<=2' },... Think about adding table name automatically for inputs??
- Save multiple records at once Record.save([r1, r2, r3])

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