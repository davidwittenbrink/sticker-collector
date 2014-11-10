import webapp2
import json
import os
import logging
import facebook
import hmac
from google.appengine.api import memcache
from google.appengine.ext import ndb
from google.appengine.api import channel

class User(ndb.Model):
    #Email might be useful if Google+ will be implemented one day.
    fb_user_id = ndb.StringProperty(required=True)
    stickers = ndb.IntegerProperty(repeated=True)
    doubles = ndb.IntegerProperty(repeated=True)
    email = ndb.StringProperty(required=True)
    
class BaseHandler(webapp2.RequestHandler):
    """Some useful little functions that are needed in multiple Handlers."""
    
    WORKING_ON_FRONTEND = False
    AUTH_SECRET = "SECRET"
    FACEBOOK_APP_ID = "SECRET"
    FACEBOOK_APP_SECRET = "SECRET"
    
    def user_is_authorized(self, token=''):
        "Get token and check if user is authorized."
        if not token: token = self.request.get('at')
        return self.check_token(token)
    
    def hash_for_auth_token(self, s):
        "Return hash sum for given string s."
        return hmac.new(self.AUTH_SECRET, s).hexdigest()
    
    def check_token(self, s):
        "Check if string s is a valid auth token."
        if s:
            unencrypted_val, encrypted_val = s.split("-")[0], s.split("-")[-1]
            if hmac.new(self.AUTH_SECRET, unencrypted_val).hexdigest() == encrypted_val:
                return True
        return False
    
    def serve_static(self, relative_path, allowed_files = ['html', 'js', 'css', 'map']):
        """Given a relative path this function trys to load a file from cache.
           If file isn't in cache, it loads it from disk and adds it to it. Optional param
           mime is used for Content-Type http header. If you are developing on the front end
           make sure to change line 
            file_text = memchache.get(relative_path)
                into
            file_text = ''
           otherwise you might not see the things you changed."""

        file_extension = relative_path.split('.')[-1]
        if not file_extension or file_extension not in allowed_files and '..' not in relative_path:
            self.error(404)
            return
        
        file_text = memcache.get(relative_path) if not self.WORKING_ON_FRONTEND else ""
        if not file_text:
            absolute_path = os.path.join(os.path.dirname(__file__), 'interface/', relative_path)
            try:
                with open (absolute_path, "r") as myfile:
                    logging.warning('Read file %s from disk' % relative_path)
                    file_text = myfile.read()
                    memcache.add(relative_path, file_text)
            except EnvironmentError: # file not found
                logging.error('Could not find %s' % absolute_path)
                self.error(404)
                return
        
        self.response.headers['Content-Type'] = self.mime_type(relative_path)
        self.response.out.write(file_text)   
        return
    
    def mime_type(self, path):
        "Return Mime type for given path. If mime is unknown, returns the empty string."
        mime_map = {"html": "text/html",
                    "css": "text/css",
                    "js": "application/javascript",
                    "json": "application/json"}
        extension = path.split('.')[-1]
        if extension in mime_map:
            return mime_map[extension]
        return ""
    
    def print_json(self, d):
        "Given a dict returns JSON to client with correct MIME"
        self.response.headers['Content-Type'] = "application/json"
        self.response.out.write(json.dumps(d))
        
    def print_user_stickers(self, user_object, friends = []):
        """Given a user_object from the database, the function prints user stickers
        in JSON format. If arg friends is given (a list of user ids), each sticker in the printed json
        also contains a field called possibleSwappers that contains all user_ids of the friends list
        that have the sticker in their doubles."""
        all_stickers = {"status": "OK", 
                        "stickers": []}
        if not friends:
            for sticker_nr in range(640):
                all_stickers["stickers"].append({"name": '',
                                                 "stickerNr": sticker_nr,
                                                 "collected": user_object and sticker_nr in user_object.stickers,
                                                 "isDouble": sticker_nr in user_object.doubles})
            self.print_json(all_stickers)
        
        else:
            friends_from_db = User.query(User.fb_user_id.IN(friends)).fetch()
            
            for sticker_nr in range(640):
                s = {"name": '',
                     "stickerNr": sticker_nr,
                     "collected": user_object and sticker_nr in user_object.stickers,
                     "isDouble": user_object and sticker_nr in user_object.doubles}
                
                if not s["collected"]:
                    s["possibleSwappers"] = [f.fb_user_id for f in friends_from_db
                                             if sticker_nr in f.doubles]
                all_stickers["stickers"].append(s)
            
            self.print_json(all_stickers)
        
class AllStickersHandler(BaseHandler):
    """Handler for /users/[uid]/stickers/all."""
    
    def delete(self, uid):
        "Resets all stickers and doubles."
        if self.user_is_authorized():
            auth_token = self.request.get('at')
            if auth_token.split('-')[0] == uid:
                user = ndb.Key('User', uid).get()
                user.doubles = []
                user.stickers = []
                user.put()
                self.print_json({"status": "OK"})
                return
        self.print_json({"status": "error",
                         "msg": "Authorization error."})
            
        
    def get(self, uid):
        """Prints all stickers to user. If friends HTTP arg is given, 
        possible Facebook Friend swappers are returned as well."""
        if self.user_is_authorized():
            friends = self.request.get("friends").split(',')
            user = ndb.Key('User', uid).get()
            if not friends:
                self.print_user_stickers(user)
            else:
                self.print_user_stickers(user, friends)
            

class GetAuthToken(BaseHandler):
    "Handler for /token"
    def get(self):
        """Given a cookie with FB Auth token (From the JS SDK) this 
        returns an auth-Token and stores the user into the DB if he's 
        not in there already"""
        
        
        return_dict = {"status":"OK",
                       "newUser": False}
        
        cookie = facebook.get_user_from_cookie(self.request.cookies,
                                               self.FACEBOOK_APP_ID,
                                               self.FACEBOOK_APP_SECRET)
        if cookie:
            graph = facebook.GraphAPI(cookie["access_token"])
            profile = graph.get_object("me")
            user_from_db = ndb.Key('User', profile['id']).get()

            if not user_from_db:
                return_dict["newUser"] = True
                user_from_db = User(key=ndb.Key('User', profile["id"]), 
                                    fb_user_id=profile["id"],
                                    email = "")
                user_from_db.put()

            return_dict["authToken"] = "%s-%s" % (profile["id"],
                                                  self.hash_for_auth_token(profile["id"]))
        else:
            return_dict.update({"status": "error", "msg": "Couldn't fetch Facebook data"})
        
        self.print_json(return_dict)
    
class CollectedHandler(BaseHandler):
    '''Handler for /users/[uid]/stickers/[sticker Nr.]'''
    
    @ndb.transactional(retries=15)            
    def post(self, uid, sticker_nr):
        "Adds a given Sticker to the users collected stickers."
        
        form_data = json.loads(self.request.body)
        if self.user_is_authorized(token=form_data['at']):
            if form_data['at'].split('-')[0] == uid:
                #User is posting sticker in his own album
                user_from_db = ndb.Key('User', uid).get()
                if int(sticker_nr) not in user_from_db.stickers:
                    user_from_db.stickers.append(int(sticker_nr))
                    user_from_db.put()
                self.print_user_stickers(user_from_db)
    
    @ndb.transactional(retries=15)
    def delete(self, uid, sticker_nr):
        "Deletes a given Sticker from the users collected stickers."
        
        if self.user_is_authorized():
            if self.request.get('at').split('-')[0] == uid:
                user_from_db = ndb.Key('User', uid).get()
                user_from_db.stickers = filter(lambda x: x != int(sticker_nr), 
                                               user_from_db.stickers)
                if int(sticker_nr) in user_from_db.doubles:
                    user_from_db.doubles = filter(lambda x: x != int(sticker_nr),
                                                  user_from_db.doubles)
                user_from_db.put()
                self.print_user_stickers(user_from_db)
                
class DoublesHandler(BaseHandler):
    
    @ndb.transactional(retries=15)
    def post(self, uid, sticker_nr):
        "Adds a given Sticker to the users double stickers."
        form_data = json.loads(self.request.body)
        if self.user_is_authorized(token=form_data['at']):
            if form_data['at'].split('-')[0] == uid:
                #User is posting sticker in his own album
                user_from_db = ndb.Key('User', uid).get()
                if int(sticker_nr) not in user_from_db.doubles:
                    user_from_db.doubles.append(int(sticker_nr))
                    if int(sticker_nr) not in user_from_db.stickers:
                        user_from_db.stickers.append(int(sticker_nr))
                    user_from_db.put()
                self.print_user_stickers(user_from_db)
    
    @ndb.transactional(retries=15)
    def delete(self, uid, sticker_nr):
        "Deletes a given Sticker from the users double stickers."
        if self.user_is_authorized():
            if self.request.get('at').split('-')[0] == uid:
                user_from_db = ndb.Key('User', uid).get()
                user_from_db.doubles = filter(lambda x: x != int(sticker_nr),
                                              user_from_db.doubles)
                user_from_db.put()
                self.print_user_stickers(user_from_db)
            
class FriendsWithCertainSticker(BaseHandler):
    "Handler for /stickers"
    
    def get(self):
        """Looks for two HTTP get arguments: friends and haveSticker. Friends is a 
        comma seperated list of user_ids and haveSticker is an integer for which sticker 
        the information is requested. You can read the request as 
            'Get me all possible swaps with [friends (http arg)]. that have the sticker [haveSticker].'
        """
        if self.user_is_authorized():
            possible_swappers = []
            user_id = self.request.get('at').split('-')[0]
            user = ndb.Key('User', user_id).get()
            fb_friends = self.request.get("friends").split(',')
            sticker_nr = self.request.get('haveSticker')
            
            if not sticker_nr:
                self.print_json({"status": "error", "msg": "You need to send a sticker nr. as haveSticker param"})
                return
            if not fb_friends:
                self.print_json({"status": "OK", "possibleSwappers": []})
                return
            
            swappers = User.query(ndb.AND(User.fb_user_id.IN(fb_friends)),
                                  ndb.AND(User.doubles == int(sticker_nr))).fetch()
            for person in swappers:
                p = {"userId": person.fb_user_id}
                p["needsFromYou"] = [x for x in range(640)
                                     if x in user.doubles and x not in person.stickers]
                possible_swappers.append(p)
                
            
            self.print_json({"status": "OK",
                             "stickerNr": sticker_nr,
                             "possibleSwappers": possible_swappers})

class PossibleSwapsByFriend(BaseHandler):
    """Handler for '/users/[user_id]/possibleSwaps"""
    
    def get(self, user_id):
        """Get possible swaps for friend with user_id given in HTTP arg friend"""
        if self.user_is_authorized():
            user = ndb.Key('User', user_id).get()
            friend_fb_id = self.request.get('friend')
            friend = ndb.Key('User', friend_fb_id).get()

            if not friend:
                self.print_json({"status": "error", "msg": "Friend not found"})
                return

            needs_from_you = [x for x in range(640) 
                              if x not in friend.stickers and x in user.doubles]
            you_need_from_him = [x for x in range(640)
                                 if x in friend.doubles and x not in user.stickers]
            self.print_json({"status": "OK",
                             "needsFromYou": needs_from_you,
                             "needFromHim": you_need_from_him})

class SingleUserHandler(BaseHandler):
    "Handler for /users/[user_id]"
    def delete(self, uid):
        "Deletes user given with uid. Facebook App disconnect should be handled on the front end"
        auth_token = self.request.get('at')
        if self.user_is_authorized():
            if auth_token.split('-')[0] == uid:
                #user is deleting himself
                ndb.Key('User', uid).delete()
                self.print_json({"status": "OK"})
                return
        self.print_json({"status": "error",
                         "msg": "Authorization error. Users can only delete themselves."})
                
class ServeFile(BaseHandler):
    """Handler for static files including the front page (index.html)."""
    def get(self, path):
        "Serves front page if path is /, else trys to serve the requested static file."
        if not path or path == '/':
            self.serve_static('index.html')
        else:
            self.serve_static(path)
            
class SwapRoomTokenHandler(BaseHandler):
    "Handler for /swapRooms/token"
    def get(self):
        "Opens a new channel and returns a new token"
        if True:#self.user_is_authorized:
            uid = "123456789"#self.request.get('at').split('-')[0]
            token = channel.create_channel(uid)
            self.print_json({"status": "OK",
                             "token": token})
            return
        self.print_json({"status": "error",
                         "msg": "Auth error."})
            
app = webapp2.WSGIApplication([('/users/([0-9]+)/stickers/all\/?', AllStickersHandler),
                               ('/users/([0-9]+)/stickers/([0-9]+)\/?', CollectedHandler),
                               ('/users/([0-9]+)/stickers/doubles/([0-9]+)\/?', DoublesHandler),
                               ('/users/([0-9]+)/possibleSwaps\/?', PossibleSwapsByFriend),
                               ('/users/([0-9]+)\/?', SingleUserHandler),
                               ('/swapRooms/token', SwapRoomTokenHandler),
                               ('/users', FriendsWithCertainSticker),
                               ('/token', GetAuthToken),
                               ('/stickers', AllStickersHandler),
                               ('/(.*)', ServeFile)
                               ], debug=True)