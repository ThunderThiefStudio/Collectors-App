#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Collector's App
Tests all authentication, collections, items, search, and sharing functionality
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://collectable.preview.emergentagent.com/api"
SAMPLE_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

class CollectorAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.username = None
        self.test_collection_id = None
        self.test_item_id = None
        self.share_code = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_result(self, test_name, success, message="", response=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text[:200]}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
        print()

    def test_user_registration(self):
        """Test user registration endpoint"""
        print("🔐 Testing User Registration...")
        
        # Generate unique username for this test run
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_user = {
            "username": f"collector_{timestamp}",
            "email": f"collector_{timestamp}@example.com",
            "password": "SecurePass123!"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/register", json=test_user)
            
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ["access_token", "user_id", "username"]):
                    self.auth_token = data["access_token"]
                    self.user_id = data["user_id"]
                    self.username = data["username"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_result("User Registration", True, f"User created: {self.username}")
                    return True
                else:
                    self.log_result("User Registration", False, "Missing required fields in response", response)
            else:
                self.log_result("User Registration", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("User Registration", False, f"Exception: {str(e)}")
        
        return False

    def test_user_login(self):
        """Test user login endpoint"""
        print("🔑 Testing User Login...")
        
        if not self.username:
            self.log_result("User Login", False, "No username available from registration")
            return False
            
        login_data = {
            "username": self.username,
            "password": "SecurePass123!"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and data["username"] == self.username:
                    self.log_result("User Login", True, "Login successful")
                    return True
                else:
                    self.log_result("User Login", False, "Invalid login response", response)
            else:
                self.log_result("User Login", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("User Login", False, f"Exception: {str(e)}")
        
        return False

    def test_get_current_user(self):
        """Test get current user endpoint"""
        print("👤 Testing Get Current User...")
        
        if not self.auth_token:
            self.log_result("Get Current User", False, "No auth token available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "username" in data and "email" in data:
                    self.log_result("Get Current User", True, f"User info retrieved: {data['username']}")
                    return True
                else:
                    self.log_result("Get Current User", False, "Missing user fields", response)
            else:
                self.log_result("Get Current User", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Current User", False, f"Exception: {str(e)}")
        
        return False

    def test_create_collection(self):
        """Test collection creation"""
        print("📁 Testing Collection Creation...")
        
        if not self.auth_token:
            self.log_result("Create Collection", False, "No auth token available")
            return False
            
        collection_data = {
            "name": "Video Game Collection",
            "category": "video games",
            "description": "My awesome video game collection"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/collections", json=collection_data)
            
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ["id", "name", "category"]):
                    self.test_collection_id = data["id"]
                    self.log_result("Create Collection", True, f"Collection created: {data['name']}")
                    return True
                else:
                    self.log_result("Create Collection", False, "Missing collection fields", response)
            else:
                self.log_result("Create Collection", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Create Collection", False, f"Exception: {str(e)}")
        
        return False

    def test_get_collections(self):
        """Test getting all collections"""
        print("📂 Testing Get Collections...")
        
        if not self.auth_token:
            self.log_result("Get Collections", False, "No auth token available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/collections")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Collections", True, f"Retrieved {len(data)} collections")
                    return True
                else:
                    self.log_result("Get Collections", False, "Response is not a list", response)
            else:
                self.log_result("Get Collections", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Collections", False, f"Exception: {str(e)}")
        
        return False

    def test_get_specific_collection(self):
        """Test getting a specific collection"""
        print("📄 Testing Get Specific Collection...")
        
        if not self.auth_token or not self.test_collection_id:
            self.log_result("Get Specific Collection", False, "No auth token or collection ID available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/collections/{self.test_collection_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["id"] == self.test_collection_id:
                    self.log_result("Get Specific Collection", True, f"Collection retrieved: {data['name']}")
                    return True
                else:
                    self.log_result("Get Specific Collection", False, "Invalid collection data", response)
            else:
                self.log_result("Get Specific Collection", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Specific Collection", False, f"Exception: {str(e)}")
        
        return False

    def test_create_item(self):
        """Test item creation with base64 image"""
        print("🎮 Testing Item Creation...")
        
        if not self.auth_token:
            self.log_result("Create Item", False, "No auth token available")
            return False
            
        item_data = {
            "collection_id": self.test_collection_id,
            "name": "Super Mario Bros",
            "description": "Classic Nintendo game",
            "images": [SAMPLE_IMAGE_BASE64],
            "barcode": "123456789012",
            "purchase_price": 29.99,
            "current_value": 45.00,
            "condition": "excellent",
            "is_wishlist": False,
            "custom_fields": {"platform": "NES", "year": "1985"}
        }
        
        try:
            response = self.session.post(f"{self.base_url}/items", json=item_data)
            
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ["id", "name", "images"]):
                    self.test_item_id = data["id"]
                    self.log_result("Create Item", True, f"Item created: {data['name']}")
                    return True
                else:
                    self.log_result("Create Item", False, "Missing item fields", response)
            else:
                self.log_result("Create Item", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Create Item", False, f"Exception: {str(e)}")
        
        return False

    def test_get_items(self):
        """Test getting all items (non-wishlist)"""
        print("📦 Testing Get Items...")
        
        if not self.auth_token:
            self.log_result("Get Items", False, "No auth token available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/items")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Items", True, f"Retrieved {len(data)} items")
                    return True
                else:
                    self.log_result("Get Items", False, "Response is not a list", response)
            else:
                self.log_result("Get Items", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Items", False, f"Exception: {str(e)}")
        
        return False

    def test_create_wishlist_item(self):
        """Test creating a wishlist item"""
        print("⭐ Testing Wishlist Item Creation...")
        
        if not self.auth_token:
            self.log_result("Create Wishlist Item", False, "No auth token available")
            return False
            
        wishlist_item = {
            "name": "Zelda: Breath of the Wild",
            "description": "Want this game!",
            "images": [SAMPLE_IMAGE_BASE64],
            "current_value": 60.00,
            "condition": "mint",
            "is_wishlist": True
        }
        
        try:
            response = self.session.post(f"{self.base_url}/items", json=wishlist_item)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("is_wishlist") == True:
                    self.log_result("Create Wishlist Item", True, f"Wishlist item created: {data['name']}")
                    return True
                else:
                    self.log_result("Create Wishlist Item", False, "Item not marked as wishlist", response)
            else:
                self.log_result("Create Wishlist Item", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Create Wishlist Item", False, f"Exception: {str(e)}")
        
        return False

    def test_get_wishlist_items(self):
        """Test getting wishlist items"""
        print("🌟 Testing Get Wishlist Items...")
        
        if not self.auth_token:
            self.log_result("Get Wishlist Items", False, "No auth token available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/items/wishlist")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Wishlist Items", True, f"Retrieved {len(data)} wishlist items")
                    return True
                else:
                    self.log_result("Get Wishlist Items", False, "Response is not a list", response)
            else:
                self.log_result("Get Wishlist Items", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Wishlist Items", False, f"Exception: {str(e)}")
        
        return False

    def test_get_collection_items(self):
        """Test getting items in a specific collection"""
        print("📋 Testing Get Collection Items...")
        
        if not self.auth_token or not self.test_collection_id:
            self.log_result("Get Collection Items", False, "No auth token or collection ID available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/items/collection/{self.test_collection_id}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Collection Items", True, f"Retrieved {len(data)} items from collection")
                    return True
                else:
                    self.log_result("Get Collection Items", False, "Response is not a list", response)
            else:
                self.log_result("Get Collection Items", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Collection Items", False, f"Exception: {str(e)}")
        
        return False

    def test_get_specific_item(self):
        """Test getting a specific item"""
        print("🎯 Testing Get Specific Item...")
        
        if not self.auth_token or not self.test_item_id:
            self.log_result("Get Specific Item", False, "No auth token or item ID available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/items/{self.test_item_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["id"] == self.test_item_id:
                    self.log_result("Get Specific Item", True, f"Item retrieved: {data['name']}")
                    return True
                else:
                    self.log_result("Get Specific Item", False, "Invalid item data", response)
            else:
                self.log_result("Get Specific Item", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Specific Item", False, f"Exception: {str(e)}")
        
        return False

    def test_update_item(self):
        """Test updating an item (including wishlist toggle)"""
        print("✏️ Testing Item Update...")
        
        if not self.auth_token or not self.test_item_id:
            self.log_result("Update Item", False, "No auth token or item ID available")
            return False
            
        update_data = {
            "name": "Super Mario Bros - Updated",
            "current_value": 50.00,
            "is_wishlist": True
        }
        
        try:
            response = self.session.put(f"{self.base_url}/items/{self.test_item_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == "Super Mario Bros - Updated" and data.get("is_wishlist") == True:
                    self.log_result("Update Item", True, "Item updated successfully")
                    return True
                else:
                    self.log_result("Update Item", False, "Item not updated correctly", response)
            else:
                self.log_result("Update Item", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Update Item", False, f"Exception: {str(e)}")
        
        return False

    def test_search_items(self):
        """Test searching items by name/description/barcode"""
        print("🔍 Testing Item Search...")
        
        if not self.auth_token:
            self.log_result("Search Items", False, "No auth token available")
            return False
            
        search_queries = ["Mario", "123456789012", "Classic"]
        
        for query in search_queries:
            try:
                response = self.session.get(f"{self.base_url}/items/search/{query}")
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        self.log_result(f"Search Items - '{query}'", True, f"Found {len(data)} items")
                    else:
                        self.log_result(f"Search Items - '{query}'", False, "Response is not a list", response)
                        return False
                else:
                    self.log_result(f"Search Items - '{query}'", False, f"HTTP {response.status_code}", response)
                    return False
                    
            except Exception as e:
                self.log_result(f"Search Items - '{query}'", False, f"Exception: {str(e)}")
                return False
        
        return True

    def test_share_collection(self):
        """Test generating share code for collection"""
        print("🔗 Testing Collection Sharing...")
        
        if not self.auth_token or not self.test_collection_id:
            self.log_result("Share Collection", False, "No auth token or collection ID available")
            return False
            
        try:
            response = self.session.post(f"{self.base_url}/share/collection/{self.test_collection_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "share_code" in data and "collection_id" in data:
                    self.share_code = data["share_code"]
                    self.log_result("Share Collection", True, f"Share code generated: {self.share_code}")
                    return True
                else:
                    self.log_result("Share Collection", False, "Missing share code fields", response)
            else:
                self.log_result("Share Collection", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Share Collection", False, f"Exception: {str(e)}")
        
        return False

    def test_view_shared_collection(self):
        """Test viewing shared collection (no auth required)"""
        print("👁️ Testing View Shared Collection...")
        
        if not self.share_code:
            self.log_result("View Shared Collection", False, "No share code available")
            return False
            
        try:
            # Create a new session without auth headers for this test
            public_session = requests.Session()
            response = public_session.get(f"{self.base_url}/share/{self.share_code}")
            
            if response.status_code == 200:
                data = response.json()
                if "collection" in data and "items" in data:
                    self.log_result("View Shared Collection", True, f"Shared collection viewed: {data['collection']['name']}")
                    return True
                else:
                    self.log_result("View Shared Collection", False, "Missing collection or items", response)
            else:
                self.log_result("View Shared Collection", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("View Shared Collection", False, f"Exception: {str(e)}")
        
        return False

    def test_delete_item(self):
        """Test deleting an item"""
        print("🗑️ Testing Item Deletion...")
        
        if not self.auth_token or not self.test_item_id:
            self.log_result("Delete Item", False, "No auth token or item ID available")
            return False
            
        try:
            response = self.session.delete(f"{self.base_url}/items/{self.test_item_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Delete Item", True, "Item deleted successfully")
                    return True
                else:
                    self.log_result("Delete Item", False, "No success message", response)
            else:
                self.log_result("Delete Item", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Delete Item", False, f"Exception: {str(e)}")
        
        return False

    def test_delete_collection(self):
        """Test deleting a collection"""
        print("🗂️ Testing Collection Deletion...")
        
        if not self.auth_token or not self.test_collection_id:
            self.log_result("Delete Collection", False, "No auth token or collection ID available")
            return False
            
        try:
            response = self.session.delete(f"{self.base_url}/collections/{self.test_collection_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Delete Collection", True, "Collection deleted successfully")
                    return True
                else:
                    self.log_result("Delete Collection", False, "No success message", response)
            else:
                self.log_result("Delete Collection", False, f"HTTP {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Delete Collection", False, f"Exception: {str(e)}")
        
        return False

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication"""
        print("🚫 Testing Unauthorized Access...")
        
        # Create session without auth headers
        unauth_session = requests.Session()
        
        protected_endpoints = [
            "/auth/me",
            "/collections",
            "/items"
        ]
        
        all_passed = True
        for endpoint in protected_endpoints:
            try:
                response = unauth_session.get(f"{self.base_url}{endpoint}")
                if response.status_code == 401:
                    self.log_result(f"Unauthorized Access - {endpoint}", True, "Correctly rejected unauthorized request")
                else:
                    self.log_result(f"Unauthorized Access - {endpoint}", False, f"Expected 401, got {response.status_code}", response)
                    all_passed = False
            except Exception as e:
                self.log_result(f"Unauthorized Access - {endpoint}", False, f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Collector's App Backend API Tests")
        print("=" * 60)
        
        # Authentication Flow Tests
        if not self.test_user_registration():
            print("❌ Registration failed - stopping tests")
            return self.results
            
        self.test_user_login()
        self.test_get_current_user()
        
        # Collections Tests
        self.test_create_collection()
        self.test_get_collections()
        self.test_get_specific_collection()
        
        # Items Tests
        self.test_create_item()
        self.test_get_items()
        self.test_create_wishlist_item()
        self.test_get_wishlist_items()
        self.test_get_collection_items()
        self.test_get_specific_item()
        self.test_update_item()
        
        # Search Tests
        self.test_search_items()
        
        # Sharing Tests
        self.test_share_collection()
        self.test_view_shared_collection()
        
        # Cleanup Tests
        self.test_delete_item()
        self.test_delete_collection()
        
        # Security Tests
        self.test_unauthorized_access()
        
        # Print Summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results

if __name__ == "__main__":
    tester = CollectorAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if results['failed'] > 0:
        sys.exit(1)
    else:
        print("\n🎉 All tests passed!")
        sys.exit(0)