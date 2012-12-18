var mongo = require('mongodb');
var mongUtil = require('./utilMongo');

var Server = mongo.Server,
	Db = mongo.Db,
	BSON = mongo.BSONPure;

var mongoUri = process.env.MONGOLAB_URI ||  'mongodb://localhost:27017/timesheetdb';
var db;

Db.connect(mongoUri, function (err, database) {
    db = database;
});

/*------------- TIMESHEET ------------------*/

exports.categories = {};

exports.categories.findAll = function(req, res) {
    db.collection('categories', function(err, collection) {
        mongUtil.getAll(collection, res);
    });
}

exports.categories.findById = function(req, res) {
    var id = req.params.id;
    db.collection('categories', function(err, collection) {
        mongUtil.getById(collection, id, res);
    });
}

exports.categories.projects = {};

exports.categories.projects.findAll = function(req, res) {
    var id = req.params.id;
    db.collection('categories', function(err, collection) {
        collection.findOne({'_id': new BSON.ObjectID(id)}, function (err, category) {
            res.send(category.projects);
        });
    });
}

exports.categories.projects.findById = function(req, res) {
    var category_id = req.params.cid;
    var project_id = req.params.pid;
    db.collection('categories', function(err, collection) {
        collection.findOne({'_id': new BSON.ObjectID(category_id), 'projects.id': new BSON.ObjectID(project_id)}, function (err, category) {
            for (var i = 0; i < category.projects.length; i++) {
                var project = category.projects[i];
                var curr_prj_id = project.id;
                if (curr_prj_id == project_id) {
                    return res.send(project);
                }
            }
            var error = {
                status : 404,
                message : "Couldn't find project id '" + project_id + "' for category id '" + category_id + "'"
            };
            res.send(error, 404);
        });
    });
}

exports.activities = {};

exports.activities.findAll = function(req, res) {
    db.collection('activities', function(err, collection) {
        mongUtil.getAll(collection, res);
    });
}

exports.findAll = function(req, res) {
    db.collection('timesheet', function(err, collection) {
	    mongUtil.getAll(collection, res);
    });
};

exports.addTimesheet = function(req, res) {
	var timesheet = req.body;
	console.log('Adding timesheet: ' + JSON.stringify(timesheet));
    db.collection('timesheet', function(err, collection) {
	    mongUtil.insertEntity(collection, timesheet, res);
    });
};

exports.updateTimesheet = function(req, res) {
	var id = req.params.id;
	var timesheet = req.body;
    console.log('Updating timesheet: ' + id);
	console.log(JSON.stringify(timesheet));
    db.collection('timesheet', function(err, collection) {
	    mongUtil.updateEntity(collection, id, timesheet, res);
    });
};

exports.deleteTimesheet = function(req, res) {
	var id = req.params.id;
	console.log('Deleting timesheet: ' + id);
    db.collection('timesheet', function(err, collection) {
	    mongUtil.deleteById(collection, id, res, req);
    });
};

exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving timesheet: ' + id);
    db.collection('timesheet', function(err, collection) {
	    mongUtil.getById(collection,id, res);
    });
};
/*------------- TIMESHEET EXTENDED ------------------*/

exports.findByProject = function(req, res){
	var project = req.params.project;
	var year = ~~req.query.year;
	var month = ~~req.query.month;

	var query = {'tasks.project':project, 'year': year};
	if (month){
		query.month = month;
	}

	db.collection('timesheet', function(err, collection) {
		mongUtil.findByQuery(collection, query, res);
	});
};

exports.findByUser = function(req, res) {
	var user = req.params.user;
	var year = ~~req.query.year;
	var month = ~~req.query.month;

	var query = {'user.login':user, 'year': year};
	if (month){
		query.month = month;
	}
	db.collection('timesheet', function(err, collection) {
		mongUtil.findByQuery(collection,query,res);
	});
};

exports.aggregByProject = function(req, res) {
	var project = req.params.project;
	var year = ~~req.query.year;
	var month = ~~req.query.month;

	 var pipelineYM = [
		 {
			 $project :
			 {
				'tasks': "$tasks",
			    'year' :1,
			    'month':1
			 }
		 },
		 {
			 $unwind: "$tasks"
		 },
		 {
			 $match:
			 {
			    year:year,
			    month: month,
				"tasks.project": project
			 }
		 },
		 {
			 $group:
			 {
				 _id: "$tasks.project",
				 hours:
				 {
					 $sum : "$tasks.hours"
				 }
			 }
		 }
	 ];
	var pipelineY = [
		{
			$project :
			{
				'tasks': "$tasks",
				'year' :1
			}
		},
		{
			$unwind: "$tasks"
		},
		{
			$match:
			{
				year:year,
				"tasks.project": project
			}
		},
		{
			$group:
			{
				_id: "$tasks.project",
				hours:
				{
					$sum : "$tasks.hours"
				}
			}
		}
	];
	db.collection('timesheet', function(err, collection) {
		if (month){
			mongUtil.aggregate(collection,pipelineYM,res);
		}else{
			mongUtil.aggregate(collection,pipelineY,res);
		}
	});

};
/*------------- PROJECT ------------------*/

exports.allProjects = function(req, res){
    db.collection('project', function(err, collection) {
	    mongUtil.getAll(collection, res);
    });
};

exports.findProjectById = function(req, res){
    var id = req.params.id;
    console.log('Retrieving project: ' + id);
    db.collection('project', function(err, collection) {
	    mongUtil.getById(collection,id, res);
    });
};

exports.addProject = function(req, res) {
	var project = req.body;
	console.log('Adding timesheet: ' + JSON.stringify(project));
	db.collection('project', function(err, collection) {
		mongUtil.insertEntity(collection, project, res);
	});
};
exports.updateProject = function(req, res) {
	var id = req.params.id;
	var project = req.body;
	console.log('Updating project: ' + id);
	console.log(JSON.stringify(project));
	db.collection('project', function(err, collection) {
		mongUtil.updateEntity(collection, id, project, res);
	});
};

exports.deleteProject = function(req, res) {
    var id = req.params.id;
    console.log('Deleting project: ' + id);
    db.collection('project', function(err, collection) {
	    mongUtil.deleteById(collection, id, res, req);
    });
};
/*------------- USER ------------------*/

exports.allUsers = function(req, res){
    db.collection('account', function(err, collection) {
	    mongUtil.getAll(collection, res);
    });
};

exports.findUserById = function(req, res){
    var id = req.params.id;
    console.log('Retrieving user: ' + id);
    db.collection('account', function(err, collection) {
	    mongUtil.getById(collection,id, res);
    });
};

exports.deleteUser = function(req, res) {
    var id = req.params.id;
    console.log('Deleting user: ' + id);
    db.collection('account', function(err, collection) {
	    mongUtil.deleteById(collection, id, res, req);
    });
};
exports.updateUser = function(req, res) {
	var id = req.params.id;
	var user = req.body;
	console.log('Updating user: ' + id);
	console.log(JSON.stringify(user));
	db.collection('account', function(err, collection) {
		mongUtil.updateEntity(collection, id, user, res);
	});
};

exports.addUser = function(req, res) {
	var user = req.body;
	console.log('Adding User: ' + JSON.stringify(user));
	db.collection('account', function(err, collection) {
		mongUtil.insertEntity(collection, user, res);
	});
};


/*------------- INIT ------------------*/

exports.init = function(req, res){
    populateDB();
    res.send();
};
var populateDB = function() {
	console.log('populateDB');
	var timesheet = [
	{
		day:11 ,
		year: 2012,
		month: 12,
		user: {
			lastname: "Leresteux",
			firstname: "Pierre",
			login: "pleresteux"
		},
		tasks: [{
			project:"LANPA",
			hours: 6
		},{
			project: "BUG_PROD",
			hours: 2
		}]
	},
	{
		day:10 ,
		year: 2012,
		month: 12,
		user: {
			lastname: "Leresteux",
			firstname: "Pierre",
			login: "pleresteux"
		},
		tasks: [{
			project: "LANPA",
			hours: 8
		}]
	},
    {
        day:10 ,
        year: 2011,
        month: 12,
        user: {
            lastname: "Leresteux",
            firstname: "Pierre",
            login: "pleresteux"
        },
        tasks: [{
            project: "IMG_LIB",
            hours: 8
        }]
    },
	{
		day:11 ,
		year: 2012,
		month: 12,
		user: {
			lastname: "David",
			firstname: "Sebastien",
			login: "sdavid"
		},
		tasks: [{
			project: "LANPA",
			hours: 4
		},{
			project: "BUG_PROD",
			hours: 3
		},{
			project: "POC_JS",
			hours: 1
		}]
	},
	{
		day:10 ,
		year: 2012,
		month: 12,
		user: {
            lastname: "Leresteux",
            firstname: "Pierre",
            login: "pleresteux"
        },
		tasks: [{
			project: "BUG_PROD",
			hours: 5
		},{
			project: "POC_EMV_PAPERBOY",
			hours: 1
		}]
	}];
    var account = [{
        lastname: "Leresteux",
        firstname: "Pierre",
        login: "pleresteux",
        email: "pleresteux@emailvision.com",
        pass : "$2a$10$mR8PzOjlCoKiEcfzM4ITvOx7vu1UeUj5rTcwbY4jFBBPpyBtT0P6S",
        date : "December 12th 2012, 8:59:17 pm"
    },{
        lastname: "David",
        firstname: "Sebastien",
        login: "sdavid",
        email: "sdavid@emailvision.com",
        pass : "$2a$10$mR8PzOjlCoKiEcfzM4ITvOx7vu1UeUj5rTcwbY4jFBBPpyBtT0P6S",
        date : "December 12th 2012, 9:02:53 pm"
    }];
    var project = [{
        project: "BUG_PROD"
    },{
        project: "POC_EMV_PAPERBOY"
    },{
        project: "LANPA"
    },{
        project: "IMG_LIB"
    },{
        project: "POC_JS"
    }];

    var categories = [{
        "name" : "Future Architecture",
        "authorized_users" : [
            { "login" : "sjob" }
        ],
        "projects" : [{
            "id" : mongo.ObjectID(),
            "name" : "DataStore",
            "accounting" : {
                "name" : "prd"
            },
            "tasks" : [{
                "id" : mongo.ObjectID(),
                "name" : "PoC"
            },{
                "id" : mongo.ObjectID(),
                "name" : "Implementation"
            }]
        }]
    },{
        "name" : "Holiday/Off",
        "authorized_users" : [
            { "login" : "sjob" }
        ],
        "projects" : [{
            "id" : mongo.ObjectID(),
            "name" : "RTT",
            "accounting" : {
                "name" : "abs"
            },
            "tasks" : [{
                "id" : mongo.ObjectID(),
                "name" : "RTT"
            }]
        },{
            "id" : mongo.ObjectID(),
            "name" : "Sick",
            "accounting" : {
                "name" : "abs"
            },
            "tasks" : [{
                "id" : mongo.ObjectID(),
                "name" : "Sick"
            }]
        },{
            "id" : mongo.ObjectID(),
            "name" : "Vacation",
            "accounting" : {
                "name" : "abs"
            },
            "tasks" : [{
                "id" : mongo.ObjectID(),
                "name" : "Vacation"
            }]
        }]
    }];
    var activities = [{
        "user" : "sdavid",
        "date" : {
            "year" : 2012,
            "month" : 12,
            "day" : 14
        },
        "hours" : 8,
        "task" : {
            "id" : categories[1].projects[2].tasks[0].id,
            "name" : "Vacation"
        },
        "project" : {
            "id" : categories[1].projects[2].id,
            "name" : "Vacation"
        },
        "category" : {
            "id" : categories[1]._id, // null at this time, need first to save categories to DB
            "name" : "Holiday/Off"
        },
        "accounting" : {
            "name" : "abs"
        }
    },{
        "user" : "sdavid",
        "date" : {
            "year" : 2012,
            "month" : 12,
            "day" : 15
        },
        "hours" : 8,
        "task" : {
            "id" : categories[1].projects[2].tasks[0].id,
            "name" : "Vacation"
        },
        "project" : {
            "id" : categories[1].projects[2].id,
            "name" : "Vacation"
        },
        "category" : {
            "id" : categories[1]._id, // null at this time, need first to save categories to DB
            "name" : "Holiday/Off"
        },
        "accounting" : {
            "name" : "abs"
        }
    },{
        "user" : "sjob",
        "date" : {
            "year" : 2012,
            "month" : 12,
            "day" : 14
        },
        "hours" : 4,
        "task" : {
            "id" : categories[1].projects[0].tasks[0].id,
            "name" : "RTT"
        },
        "project" : {
            "id" : categories[1].projects[0].id,
            "name" : "RTT"
        },
        "category" : {
            "id" : categories[1]._id, // null at this time, need first to save categories to DB
            "name" : "Holiday/Off"
        },
        "accounting" : {
            "name" : "abs"
        }
    },{
        "user" : "sjob",
        "date" : {
            "year" : 2012,
            "month" : 12,
            "day" : 14
        },
        "hours" : 4,
        "task" : {
            "id" : categories[0].projects[0].tasks[0].id,
            "name" : "PoC"
        },
        "project" : {
            "id" : categories[0].projects[0].id,
            "name" : "DataStore"
        },
        "category" : {
            "id" : categories[0]._id, // null at this time, need first to save categories to DB
            "name" : "Future Architecture"
        },
        "accounting" : {
            "name" : "prd"
        }
    }];

    db.collection('timesheet', function(err, collection) {
        collection.drop();
        collection.insert(timesheet, {safe:true}, function(err, result) {});
    });
    db.collection('account', function(err, collection) {
        collection.drop();
        collection.insert(account, {safe:true}, function(err, result) {});
    });
    db.collection('project', function(err, collection) {
        collection.drop();
        collection.insert(project, {safe:true}, function(err, result) {});
    });
    db.collection('categories', function(err, collection) {
        collection.drop();
        collection.insert(categories, {safe:true}, function(err, result) {});

        // Adding activities asynchronously after categories are added since we need their id
        collection.find().toArray(function(err, found_categories) {
            activities[0].category.id = found_categories[1]._id;
            activities[1].category.id = found_categories[1]._id;
            activities[2].category.id = found_categories[1]._id;
            activities[3].category.id = found_categories[0]._id;

            db.collection('activities', function(err, collection) {
                collection.drop();
                collection.insert(activities, {safe:true}, function(err, result) {});
            });
        });
    });
};
