CREATE TABLE documents (
	title VARCHAR(255), 
	namespace VARCHAR(255) DEFAULT '문서', 
	content TEXT DEFAULT '' NOT NULL, 
	time INTEGER DEFAULT 0,
	
	PRIMARY KEY(title, namespace)
);

CREATE TABLE history (
	title VARCHAR(255) DEFAULT '' NOT NULL, 
	namespace VARCHAR(255) DEFAULT '문서' NOT NULL, 
	content TEXT DEFAULT '' NOT NULL, 
	rev INTEGER NOT NULL, 
	time INTEGER NOT NULL, 
	author VARCHAR(32), 
	ip VARCHAR(39), 
	changes INTEGER DEFAULT 0 NOT NULL, 
	log VARCHAR(190) DEFAULT '' NOT NULL, 
	logtype ENUM('normal', 'create', 'move', 'delete', 'revert', 'acl') DEFAULT 'normal' NOT NULL, 
	edit_request_id INTEGER, 
	flags TEXT DEFAULT '' NOT NULL, 
	api BOOLEAN DEFAULT 0 NOT NULL, 
	log_hider VARCHAR(32) DEFAULT '' NOT NULL,
	
	-- FOREIGN KEY(author) REFERENCES users(username) ON UPDATE CASCADE,
	-- FOREIGN KEY(log_hider) REFERENCES users(username) ON UPDATE CASCADE,
	CONSTRAINT unique_item UNIQUE(title, namespace, rev)
);

CREATE TABLE users (
	username VARCHAR(32), 
	password VARCHAR(128) NOT NULL,  -- 현재 64자로 해시되나 나중에 512비트로 고도화를 대비
	password_hash_type ENUM('sha3-256', 'sha3-512') DEFAULT 'sha3-512' NOT NULL,
	
	PRIMARY KEY(username)
);

CREATE TABLE user_settings (
	username VARCHAR(32), 
	key TEXT DEFAULT '' NOT NULL, 
	value TEXT DEFAULT '' NOT NULL,
	
	PRIMARY KEY(username, key),
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE config (
	key TEXT DEFAULT '' NOT NULL, 
	value TEXT DEFAULT '' NOT NULL,
	
	PRIMARY KEY(key)
);

CREATE TABLE email_filters (
	address TEXT DEFAULT '' NOT NULL
);

CREATE TABLE stars (
	title VARCHAR(255) NOT NULL, 
	namespace VARCHAR(255) DEFAULT '문서' NOT NULL, 
	username VARCHAR(32) NOT NULL, 
	
	FOREIGN KEY username REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT unique_item UNIQUE(title, namespace, username)
);

CREATE TABLE perms (
	perm VARCHAR(32) NOT NULL, 
	username VARCHAR(32) NOT NULL,
	
	FOREIGN KEY username REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT unique_item UNIQUE(perm, username)
);

CREATE TABLE threads (
	title VARCHAR(255) NOT NULL, 
	namespace VARCHAR(255) DEFAULT '문서' NOT NULL, 
	topic TEXT NOT NULL, 
	status ENUM('close', 'normal', 'pause') DEFAULT 'normal' NOT NULL, 
	time INTEGER NOT NULL, 
	slug VARCHAR(22), 
	id INTEGER,
	deleted BOOLEAN DEFAULT 0 NOT NULL, 
	new_slug VARCHAR(100),  -- the seed 4.16.0 이상 주소
	
	PRIMARY KEY(slug)
);

CREATE TABLE res (
	id INTEGER NOT NULL, 
	content TEXT DEFAULT '' NOT NULL, 
	author VARCHAR(32), 
	ip VARCHAR(39), 
	time INTEGER NOT NULL, 
	hidden BOOLEAN DEFAULT 0 NOT NULL, 
	hider VARCHAR(32), 
	status BOOLEAN DEFAULT 0 NOT NULL, 
	slug VARCHAR(22) NOT NULL, 
	admin BOOLEAN DEFAULT 0 NOT NULL, 
	status_type ENUM('status', 'document', 'topic'),
	
	-- FOREIGN KEY(author) REFERENCES users(username) ON UPDATE CASCADE,
	-- FOREIGN KEY(hider) REFERENCES users(username) ON UPDATE CASCADE,
	PRIMARY KEY(id, slug),
	FOREIGN KEY(slug) REFERENCES threads(slug) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE useragents (
	username VARCHAR(32) NOT NULL, 
	useragents TEXT DEFAULT '' NOT NULL,
	
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE login_history (
	username VARCHAR(32) NOT NULL, 
	ip VARCHAR(39) DEFAULT '127.0.0.1' NOT NULL, 
	time INTEGER NOT NULL,
	
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE account_creation (
	key VARCHAR(64) DEFAULT '' NOT NULL, 
	email TEXT DEFAULT '' NOT NULL, 
	time INTEGER DEFAULT 0 NOT NULL,
	
	PRIMARY KEY(key)
);

CREATE TABLE acl (
	title VARCHAR(255), 
	namespace VARCHAR(255) NOT NULL, 
	id INTEGER NOT NULL, 
	type ENUM('read', 'edit', 'move', 'delete', 'create_thread', 'write_thread_comment', 'edit_request', 'acl') NOT NULL, 
	action ENUM('allow', 'deny', 'gotons') NOT NULL, 
	expiration INTEGER DEFAULT '' NOT NULL, 
	condition_type TEXT DEFAULT '' NOT NULL, 
	condition TEXT DEFAULT '' NOT NULL, 
	nsacl BOOLEAN DEFAULT 0 NOT NULL
);

CREATE TABLE ipacl (
	cidr VARCHAR(43) NOT NULL, 
	allow_login BOOLEAN DEFAULT 0 NOT NULL, 
	expiration INTEGER DEFAULT 0 NOT NULL, 
	note TEXT DEFAULT '' NOT NULL, 
	date INTEGER NOT NULL,
	
	PRIMARY KEY(cidr)
);

CREATE TABLE suspend_account (
	username VARCHAR(32) NOT NULL, 
	date INTEGER NOT NULL, 
	expiration INTEGER NOT NULL, 
	note TEXT DEFAULT '' NOT NULL,
	
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
	PRIMARY KEY(username)
);

CREATE TABLE aclgroup_groups (
	name TEXT NOT NULL, 
	admin TEXT DEFAULT '' NOT NULL, 
	date TEXT DEFAULT '' NOT NULL, 
	lastupdate TEXT DEFAULT '' NOT NULL, 
	css TEXT DEFAULT '' NOT NULL, 
	warning_description TEXT DEFAULT '' NOT NULL, 
	disallow_signup BOOLEAN DEFAULT 0 NOT NULL,
	
	PRIMARY KEY(name)
);

CREATE TABLE aclgroup (
	aclgroup TEXT DEFAULT '' NOT NULL, 
	type TEXT DEFAULT '' NOT NULL, 
	username VARCHAR(32), 
	cidr VARCHAR(43), 
	note TEXT DEFAULT '' NOT NULL, 
	date TEXT DEFAULT '' NOT NULL, 
	expiration TEXT DEFAULT '' NOT NULL, 
	id INTEGER NOT NULL,
	
	FOREIGN KEY(aclgroup) REFERENCES aclgroup_groups(name) ON DELETE CASCADE,
	FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE,
	PRIMARY KEY(id, aclgroup)
);

CREATE TABLE block_history (
	date INTEGER NOT NULL, 
	type ENUM('aclgroup_add', 'aclgroup_remove', 'ipacl_add', 'ipacl_remove', 'login_history', 'suspend_account', 'grant', 'batch_revert') NOT NULL, 
	aclgroup TEXT, 
	aclgroup_id INTEGER, 
	duration INTEGER, 
	note TEXT, 
	executer_author VARCHAR(32), 
	executer_ip VARCHAR(39), 
	target TEXT NOT NULL, 
	id INTEGER,
	
	-- FOREIGN KEY(executer_author) REFERENCES users(username) ON UPDATE CASCADE,
	PRIMARY KEY(id)
);

CREATE TABLE edit_requests (
	title VARCHAR(255) NOT NULL, 
	namespace VARCHAR(255) DEFAULT '문서' NOT NULL, 
	id INTEGER, 
	deleted BOOLEAN DEFAULT 0 NOT NULL, 
	state ENUM('open', 'accepted', 'closed') DEFAULT 'open' NOT NULL, 
	content TEXT DEFAULT '' NOT NULL, 
	baserev INTEGER NOT NULL, 
	author VARCHAR(32), 
	ip VARCHAR(39), 
	log VARCHAR(190) DEFAULT '' NOT NULL, 
	date INTEGER NOT NULL, 
	processor_author VARCHAR(32), 
	processor_ip VARCHAR(39), 
	last_update INTEGER NOT NULL, 
	processed_time INTEGER, 
	close_reason TEXT, 
	accepted_rev INTEGER,
	slug VARCHAR(100),  -- the seed 4.16.0 이상 주소
	
	PRIMARY KEY(id),
	-- FOREIGN KEY(author) REFERENCES users(username) ON UPDATE CASCADE,
	-- FOREIGN KEY(processor_author) REFERENCES users(username) ON UPDATE CASCADE,
	FOREIGN KEY(title, namespace, rev) REFERENCES history(title, namespace, rev) ON UPDATE CASCADE,
	FOREIGN KEY(title, namespace, baserev) REFERENCES history(title, namespace, rev) ON UPDATE CASCADE
);

CREATE TABLE files (
	title VARCHAR(255) NOT NULL, 
	namespace VARCHAR(255) DEFAULT '파일' NOT NULL, 
	hash VARCHAR(64) NOT NULL, 
	url TEXT NOT NULL, 
	size INTEGER NOT NULL, 
	width INTEGER NOT NULL, 
	height INTEGER NOT NULL
);

CREATE TABLE backlink (
	title VARCHAR(255) NOT NULL, 
	namespace VARCHAR(255) DEFAULT '문서' NOT NULL, 
	link_title VARCHAR(255) NOT NULL, 
	link_namespace VARCHAR(255) DEFAULT '문서' NOT NULL, 
	type ENUM('link', 'file', 'include', 'redirect') DEFAULT '' NOT NULL, 
	exist BOOLEAN DEFAULT 1 NOT NULL
);

CREATE TABLE classic_acl (
	title VARCHAR(255) DEFAULT '',  -- 빈 문자열이면 이름공간 ACL임
	namespace VARCHAR(255) DEFAULT '문서', 
	blockkorea BOOLEAN DEFAULT 0 NOT NULL, 
	blockbot BOOLEAN DEFAULT 0 NOT NULL, 
	read ENUM('everyone', 'member', 'admin') DEFAULT 'everyone' NOT NULL, 
	edit ENUM('everyone', 'member', 'admin') DEFAULT 'everyone' NOT NULL, 
	del ENUM('everyone', 'member', 'admin') DEFAULT 'everyone' NOT NULL, 
	discuss ENUM('everyone', 'member', 'admin') DEFAULT 'everyone' NOT NULL, 
	move ENUM('everyone', 'member', 'admin') DEFAULT 'everyone' NOT NULL,
	
	PRIMARY KEY(title, namespace)
);

CREATE TABLE autologin_tokens (
	username VARCHAR(32) NOT NULL, 
	token VARCHAR(128) NOT NULL,
	
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT unique_item UNIQUE(token)
);

CREATE TABLE trusted_devices (
	username VARCHAR(128) NOT NULL, 
	id VARCHAR(32) NOT NULL,
	
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT unique_item UNIQUE(username, id)
);

CREATE TABLE api_tokens (
	username TEXT DEFAULT '' NOT NULL, 
	token TEXT DEFAULT '' NOT NULL,
	
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT unique_item UNIQUE(username, token)
);

CREATE TABLE recover_account (
	key VARCHAR(64) DEFAULT '' NOT NULL, 
	username TEXT NOT NULL, 
	email TEXT NOT NULL, 
	time INTEGER NOT NULL,
	
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT unique_item UNIQUE(username, key)
);

CREATE TABLE boardipacl (
	cidr VARCHAR(43) NOT NULL, 
	expiration INTEGER DEFAULT 0 NOT NULL, 
	note TEXT DEFAULT '' NOT NULL, 
	date INTEGER NOT NULL,
	
	PRIMARY KEY(cidr)
);

CREATE TABLE boardsuspendaccount (
	username TEXT DEFAULT '' NOT NULL, 
	expiration INTEGER DEFAULT 0 NOT NULL, 
	note TEXT DEFAULT '' NOT NULL, 
	date INTEGER NOT NULL,
	
	FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
	PRIMARY KEY(username)
);
