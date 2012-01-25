// ====================================================================

pscript.startup_make_sidebar = function() {
	$y(page_body.left_sidebar, {width:(100/6)+'%', paddingTop:'8px'});

	var callback = function(r,rt) {
		// menu
		var ml = r.message;

		// clear
		page_body.left_sidebar.innerHTML = '';

		for(var m=0; m<ml.length; m++){
			if(ml[m]) {
				new SidebarItem(ml[m]);
			}
		}
		if(in_list(user_roles, 'System Manager')) {
			var div = $a(page_body.left_sidebar, 'div', 'link_type', {padding:'8px', fontSize:'11px'});
			$(div).html('[edit]').click(pscript.startup_set_module_order)
		}
		nav_obj.observers.push({notify:function(t,dt,dn) { pscript.select_sidebar_menu(t, dt, dn); }});

		// select current
		var no = nav_obj.ol[nav_obj.ol.length-1];
		if(no && menu_item_map[decodeURIComponent(no[0])][decodeURIComponent(no[1])])
			pscript.select_sidebar_menu(decodeURIComponent(no[0]), decodeURIComponent(no[1]));
	}
	$c_obj('Home Control', 'get_modules', '', callback);
}

// ====================================================================
// Menu observer
// ====================================================================

cur_menu_pointer = null;
var menu_item_map = {'Form':{}, 'Page':{}, 'Report':{}, 'List':{}}

pscript.select_sidebar_menu = function(t, dt, dn) {
	// get menu item
	if(menu_item_map[t][dt]) {
		// select
		menu_item_map[t][dt].select();
	} else {
		// none found :-( Unselect
		if(cur_menu_pointer)
			cur_menu_pointer.deselect();
	}
}

// ====================================================================
// Menu pointer
// ====================================================================

var body_background = '#e2e2e2';

MenuPointer = function(parent, label) {

	this.wrapper = $a(parent, 'div', '', {padding:'0px', cursor:'pointer', margin:'2px 0px'});
	$br(this.wrapper, '3px');

	this.tab = make_table($a(this.wrapper, 'div'), 1, 2, '100%', ['', '11px'], {height:'22px',
		verticalAlign:'middle', padding:'0px'}, {borderCollapse:'collapse', tableLayout:'fixed'});

	$y($td(this.tab, 0, 0), {padding:'0px 4px', color:'#444', whiteSpace:'nowrap'});

	// triangle border (?)
	this.tab.triangle_div = $a($td(this.tab, 0, 1), 'div','', {
		borderColor: body_background + ' ' + body_background + ' ' + body_background + ' ' + 'transparent',
		borderWidth:'11px', borderStyle:'solid', height:'0px', width:'0px', marginRight:'-11px'});

	this.label_area = $a($td(this.tab, 0, 0), 'span', '', '', label);

	$(this.wrapper)
		.hover(
			function() { if(!this.selected)$bg(this, '#eee'); } ,
			function() { if(!this.selected)$bg(this, body_background); }
		)

	$y($td(this.tab, 0, 0), {borderBottom:'1px solid #ddd'});

}

// ====================================================================

MenuPointer.prototype.select = function(grey) {
	$y($td(this.tab, 0, 0), {color:'#fff', borderBottom:'0px solid #000'});
	//$gr(this.wrapper, '#F84', '#F63');
	$gr(this.wrapper, '#888', '#666');
	this.selected = 1;

	if(cur_menu_pointer && cur_menu_pointer != this)
		cur_menu_pointer.deselect();

	cur_menu_pointer = this;
}

// ====================================================================

MenuPointer.prototype.deselect = function() {
	$y($td(this.tab, 0, 0), {color:'#444', borderBottom:'1px solid #ddd'});
	$gr(this.wrapper, body_background, body_background);
	this.selected = 0;
}


// ====================================================================
// Sidebar Item
// ====================================================================

var cur_sidebar_item = null;

SidebarItem = function(det) {
	var me = this;
	this.det = det;
	this.wrapper = $a(page_body.left_sidebar, 'div', '', {marginRight:'12px'});

	this.body = $a(this.wrapper, 'div');
	this.tab = make_table(this.body, 1, 2, '100%', ['24px', null], {verticalAlign:'middle'}, {tableLayout:'fixed'});

	// icon
	var ic = $a($td(this.tab, 0, 0), 'div', 'module-icons module-icons-' + det.module_label.toLowerCase(), {marginLeft:'3px', marginBottom:'-2px'});

	// pointer table
	this.pointer = new MenuPointer($td(this.tab, 0, 1), det.module_label);
	$y($td(this.pointer.tab, 0, 0), {fontWeight:'bold'});

	// for page type
	if(det.module_page) {
		menu_item_map.Page[det.module_page] = this.pointer;
	}

	// items area
	this.items_area = $a(this.wrapper, 'div');

	this.body.onclick = function() { me.onclick(); }
}

// ====================================================================

SidebarItem.prototype.onclick = function() {
	var me = this;

	if(this.det.module_page) {
		// page type
		this.pointer.select();

		$item_set_working(me.pointer.label_area);
		loadpage(this.det.module_page, function() { $item_done_working(me.pointer.label_area); });

	} else {
		// show sub items
		this.toggle();
	}
}

// ====================================================================

SidebarItem.prototype.collapse = function() {
	$(this.items_area).slideUp();
	this.is_open = 0;
	$fg(this.pointer.label_area, '#444')
}

// ====================================================================

SidebarItem.prototype.toggle = function() {
	if(this.loading) return;

	if(this.is_open) {
		this.collapse();
	} else {
		if(this.loaded) $(this.items_area).slideDown();
		else this.show_items();
		this.is_open = 1;
		$fg(this.pointer.label_area, '#000')
		//this.pointer.select(1);

		// close existing open
		if(cur_sidebar_item && cur_sidebar_item != this) {
			cur_sidebar_item.collapse();
		}
		cur_sidebar_item = this;
	}
}

// ====================================================================

SidebarItem.prototype.show_items = function() {
	this.loading = 1;
	var me = this;

	$item_set_working(this.pointer.label_area);
	var callback = function(r,rt){
		me.loaded = 1;
		me.loading = 0;
		var smi = null;
		var has_reports = 0;
		var has_tools = 0;

		// widget code
		$item_done_working(me.pointer.label_area);

		if(r.message.il) {
			me.il = r.message.il;

			// forms
			for(var i=0; i<me.il.length;i++){
				if(me.il[i].doc_type == 'Forms') {
					if(in_list(profile.can_read, me.il[i].doc_name)) {
						var smi = new SidebarModuleItem(me, me.il[i]);

						menu_item_map['Form'][me.il[i].doc_name] = smi.pointer;
						menu_item_map['List'][me.il[i].doc_name] = smi.pointer;
					}
				}
				if(me.il[i].doc_type=='Reports') has_reports = 1;
				if(in_list(['Single DocType', 'Pages', 'Setup Forms'], me.il[i].doc_type)) 
					has_tools = 1;
			}
			// reports
			if(has_reports) {
				var smi = new SidebarModuleItem(me, {doc_name:'Reports', doc_type:'Reports'});

				// add to menu-item mapper
				menu_item_map['Page'][me.det.module_label + ' Reports'] = smi.pointer;
			}

			// tools
			if(has_tools) {
				var smi = new SidebarModuleItem(me, {doc_name:'Tools', doc_type:'Tools'});

				// add to menu-item mapper
				menu_item_map['Page'][me.det.module_label + ' Tools'] = smi.pointer;
			}

			// custom reports
			if(r.message.custom_reports.length) {
				me.il = add_lists(r.message.il, r.message.custom_reports);
				var smi = new SidebarModuleItem(me, {doc_name:'Custom Reports', doc_type:'Custom Reports'});

				// add to menu-item mapper
				menu_item_map['Page'][me.det.module_label + ' Custom Reports'] = smi.pointer;
			}
		}
		
		
		$(me.items_area).slideDown();

		// high light
		var no = nav_obj.ol[nav_obj.ol.length-1];
		if(no && menu_item_map[decodeURIComponent(no[0])][decodeURIComponent(no[1])])
			pscript.select_sidebar_menu(decodeURIComponent(no[0]), decodeURIComponent(no[1]));

	}

	$c_obj('Home Control', 'get_module_details', me.det.name, callback);
}

// ====================================================================
// Show Reports
// ====================================================================

SidebarItem.prototype.show_section = function(sec_type) {
	var me = this;
	var label = this.det.module_label + ' ' + sec_type;
	var type_map = {'Reports':'Reports', 'Custom Reports':'Custom Reports', 'Pages':'Tools', 'Single DocType':'Tools', 'Setup Forms':'Tools'}

	if(page_body.pages[label]) {
		loadpage(label, null, 1);
	} else {
		// make the reports page
		var page = page_body.add_page(label);
		this.wrapper = $a(page,'div','layout_wrapper');


		// head
		this.head = new PageHeader(this.wrapper, label);

		// body
		this.body1 = $a(this.wrapper, 'div', '', {marginTop:'16px'});

		// add a report link
		var add_link = function(det) {
			var div = $a(me.body1, 'div', '', {marginBottom:'6px'});
			var span = $a(div, 'span', 'link_type');

			// tag the span
			span.innerHTML = det.display_name; span.det = det;
			if(sec_type=='Reports' || sec_type=='Custom Reports') {
				// Reports
				// -------
				span.onclick = function() { loadreport(this.det.doc_name, this.det.display_name); }

			} else {
				// Tools
				// -----

				if(det.doc_type=='Pages') {
					// Page
					if(det.click_function) {
						span.onclick = function() { eval(this.det.click_function) }
						span.click_function = det.click_function;
					} else {
						span.onclick = function() { loadpage(this.det.doc_name); }
					}
				} else if(det.doc_type=='Setup Forms') {
					// Doc Browser
					span.onclick = function() { loaddocbrowser(this.det.doc_name); }
				} else {
					// Single
					span.onclick = function() { loaddoc(this.det.doc_name, this.det.doc_name); }
				}
			}
		}

		// item list
		for(var i=0; i<me.il.length;i++){
			if(type_map[me.il[i].doc_type] == sec_type) {
				add_link(me.il[i]);
			}
		}
		loadpage(label, null, 1);
	}
}


// ====================================================================
// Sidebar module item
// ====================================================================

SidebarModuleItem = function(si, det) {
	this.det = det;
	var me= this;

	this.pointer = new MenuPointer(si.items_area, get_doctype_label(det.doc_name));
	$y(si.items_area, {marginLeft:'32px'})
	$y($td(this.pointer.tab, 0, 0), {fontSize:'11px'});

	this.pointer.wrapper.onclick = function() {
		if(me.det.doc_type=='Forms')
			loaddocbrowser(det.doc_name);
		else
			si.show_section(me.det.doc_type);
	}
}


// ====================================================================
// Drag & Drop order selection
// ====================================================================

pscript.startup_set_module_order = function() {
	var update_order= function(ml) {
		mdict = {};
		for(var i=0; i<ml.length; i++) {
			mdict[ml[i][3][3]] = {'module_seq':ml[i][1], 'is_hidden':(ml[i][2] ? 'No' : 'Yes')}
		}
		$c_obj('Home Control', 'set_module_order', JSON.stringify(mdict), function(r,rt) { pscript.startup_make_sidebar(); } )
	}

	var callback = function(r, rt) {
		var ml = [];
		for(var i=0; i<r.message.length; i++) {
			var det = r.message[i];
			ml.push([det[1], det[2], (det[3]!='No' ? 0 : 1), det[0]]);
		}
		new ListSelector('Set Module Sequence', 'Select items and set the order you want them to appear'+
			'<br><b>Note:</b> <i>These changes will apply to all users!</i>', ml, update_order, 1);
	}
	$c_obj('Home Control', 'get_module_order', '', callback)

}
