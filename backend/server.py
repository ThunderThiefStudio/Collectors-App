from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Pydantic Models
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str

class CollectionCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = ""

class CollectionResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    item_count: int = 0
    created_at: datetime

class ItemCreate(BaseModel):
    collection_id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    images: List[str] = []  # base64 encoded images
    barcode: Optional[str] = None
    purchase_price: Optional[float] = 0.0
    current_value: Optional[float] = 0.0
    asking_price: Optional[float] = 0.0
    condition: Optional[str] = "good"
    status: Optional[str] = "owned"  # owned, looking_for, selling
    is_wishlist: bool = False
    custom_fields: Optional[dict] = {}

class ItemUpdate(BaseModel):
    collection_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    barcode: Optional[str] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    asking_price: Optional[float] = None
    condition: Optional[str] = None
    status: Optional[str] = None
    is_wishlist: Optional[bool] = None
    custom_fields: Optional[dict] = None

class ItemResponse(BaseModel):
    id: str
    collection_id: Optional[str]
    name: str
    description: str
    images: List[str]
    barcode: Optional[str]
    purchase_price: float
    current_value: float
    asking_price: float
    condition: str
    status: str
    is_wishlist: bool
    custom_fields: dict
    created_at: datetime
    updated_at: datetime

class ShareCollectionResponse(BaseModel):
    share_code: str
    collection_id: str

# Auth Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    user_dict = {
        "username": user.username,
        "email": user.email,
        "password_hash": get_password_hash(user.password),
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    return TokenResponse(
        access_token=access_token,
        user_id=user_id,
        username=user.username
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"username": user.username})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    user_id = str(db_user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    return TokenResponse(
        access_token=access_token,
        user_id=user_id,
        username=db_user["username"]
    )

@api_router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"]
    }

# Collection Routes
@api_router.get("/collections", response_model=List[CollectionResponse])
async def get_collections(user_id: str = Depends(get_current_user)):
    collections = await db.collections.find({"user_id": user_id}).to_list(1000)
    result = []
    for coll in collections:
        # Count items in this collection
        item_count = await db.items.count_documents({"collection_id": str(coll["_id"])})
        result.append(CollectionResponse(
            id=str(coll["_id"]),
            name=coll["name"],
            category=coll["category"],
            description=coll.get("description", ""),
            item_count=item_count,
            created_at=coll["created_at"]
        ))
    return result

@api_router.post("/collections", response_model=CollectionResponse)
async def create_collection(collection: CollectionCreate, user_id: str = Depends(get_current_user)):
    coll_dict = {
        "user_id": user_id,
        "name": collection.name,
        "category": collection.category,
        "description": collection.description,
        "created_at": datetime.utcnow()
    }
    result = await db.collections.insert_one(coll_dict)
    return CollectionResponse(
        id=str(result.inserted_id),
        name=collection.name,
        category=collection.category,
        description=collection.description,
        item_count=0,
        created_at=coll_dict["created_at"]
    )

@api_router.get("/collections/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: str, user_id: str = Depends(get_current_user)):
    collection = await db.collections.find_one({"_id": ObjectId(collection_id), "user_id": user_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    item_count = await db.items.count_documents({"collection_id": collection_id})
    return CollectionResponse(
        id=str(collection["_id"]),
        name=collection["name"],
        category=collection["category"],
        description=collection.get("description", ""),
        item_count=item_count,
        created_at=collection["created_at"]
    )

@api_router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, user_id: str = Depends(get_current_user)):
    result = await db.collections.delete_one({"_id": ObjectId(collection_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    # Also delete all items in this collection
    await db.items.delete_many({"collection_id": collection_id})
    return {"message": "Collection deleted successfully"}

# Item Routes
@api_router.get("/items", response_model=List[ItemResponse])
async def get_items(user_id: str = Depends(get_current_user)):
    items = await db.items.find({"user_id": user_id, "is_wishlist": False}).to_list(1000)
    return [ItemResponse(
        id=str(item["_id"]),
        collection_id=item.get("collection_id"),
        name=item["name"],
        description=item.get("description", ""),
        images=item.get("images", []),
        barcode=item.get("barcode"),
        purchase_price=item.get("purchase_price", 0.0),
        current_value=item.get("current_value", 0.0),
        condition=item.get("condition", "good"),
        is_wishlist=item.get("is_wishlist", False),
        custom_fields=item.get("custom_fields", {}),
        created_at=item["created_at"],
        updated_at=item["updated_at"]
    ) for item in items]

@api_router.get("/items/wishlist", response_model=List[ItemResponse])
async def get_wishlist_items(user_id: str = Depends(get_current_user)):
    items = await db.items.find({"user_id": user_id, "is_wishlist": True}).to_list(1000)
    return [ItemResponse(
        id=str(item["_id"]),
        collection_id=item.get("collection_id"),
        name=item["name"],
        description=item.get("description", ""),
        images=item.get("images", []),
        barcode=item.get("barcode"),
        purchase_price=item.get("purchase_price", 0.0),
        current_value=item.get("current_value", 0.0),
        condition=item.get("condition", "good"),
        is_wishlist=item.get("is_wishlist", False),
        custom_fields=item.get("custom_fields", {}),
        created_at=item["created_at"],
        updated_at=item["updated_at"]
    ) for item in items]

@api_router.get("/items/collection/{collection_id}", response_model=List[ItemResponse])
async def get_collection_items(collection_id: str, user_id: str = Depends(get_current_user)):
    items = await db.items.find({"collection_id": collection_id, "user_id": user_id}).to_list(1000)
    return [ItemResponse(
        id=str(item["_id"]),
        collection_id=item.get("collection_id"),
        name=item["name"],
        description=item.get("description", ""),
        images=item.get("images", []),
        barcode=item.get("barcode"),
        purchase_price=item.get("purchase_price", 0.0),
        current_value=item.get("current_value", 0.0),
        condition=item.get("condition", "good"),
        is_wishlist=item.get("is_wishlist", False),
        custom_fields=item.get("custom_fields", {}),
        created_at=item["created_at"],
        updated_at=item["updated_at"]
    ) for item in items]

@api_router.post("/items", response_model=ItemResponse)
async def create_item(item: ItemCreate, user_id: str = Depends(get_current_user)):
    item_dict = {
        "user_id": user_id,
        "collection_id": item.collection_id,
        "name": item.name,
        "description": item.description,
        "images": item.images,
        "barcode": item.barcode,
        "purchase_price": item.purchase_price,
        "current_value": item.current_value,
        "condition": item.condition,
        "is_wishlist": item.is_wishlist,
        "custom_fields": item.custom_fields or {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.items.insert_one(item_dict)
    return ItemResponse(
        id=str(result.inserted_id),
        collection_id=item.collection_id,
        name=item.name,
        description=item.description,
        images=item.images,
        barcode=item.barcode,
        purchase_price=item.purchase_price,
        current_value=item.current_value,
        condition=item.condition,
        is_wishlist=item.is_wishlist,
        custom_fields=item.custom_fields or {},
        created_at=item_dict["created_at"],
        updated_at=item_dict["updated_at"]
    )

@api_router.get("/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: str, user_id: str = Depends(get_current_user)):
    item = await db.items.find_one({"_id": ObjectId(item_id), "user_id": user_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return ItemResponse(
        id=str(item["_id"]),
        collection_id=item.get("collection_id"),
        name=item["name"],
        description=item.get("description", ""),
        images=item.get("images", []),
        barcode=item.get("barcode"),
        purchase_price=item.get("purchase_price", 0.0),
        current_value=item.get("current_value", 0.0),
        condition=item.get("condition", "good"),
        is_wishlist=item.get("is_wishlist", False),
        custom_fields=item.get("custom_fields", {}),
        created_at=item["created_at"],
        updated_at=item["updated_at"]
    )

@api_router.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, item_update: ItemUpdate, user_id: str = Depends(get_current_user)):
    # Get existing item
    existing_item = await db.items.find_one({"_id": ObjectId(item_id), "user_id": user_id})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Update only provided fields
    update_dict = {"updated_at": datetime.utcnow()}
    if item_update.collection_id is not None:
        update_dict["collection_id"] = item_update.collection_id
    if item_update.name is not None:
        update_dict["name"] = item_update.name
    if item_update.description is not None:
        update_dict["description"] = item_update.description
    if item_update.images is not None:
        update_dict["images"] = item_update.images
    if item_update.barcode is not None:
        update_dict["barcode"] = item_update.barcode
    if item_update.purchase_price is not None:
        update_dict["purchase_price"] = item_update.purchase_price
    if item_update.current_value is not None:
        update_dict["current_value"] = item_update.current_value
    if item_update.condition is not None:
        update_dict["condition"] = item_update.condition
    if item_update.is_wishlist is not None:
        update_dict["is_wishlist"] = item_update.is_wishlist
    if item_update.custom_fields is not None:
        update_dict["custom_fields"] = item_update.custom_fields
    
    await db.items.update_one({"_id": ObjectId(item_id)}, {"$set": update_dict})
    
    # Get updated item
    updated_item = await db.items.find_one({"_id": ObjectId(item_id)})
    return ItemResponse(
        id=str(updated_item["_id"]),
        collection_id=updated_item.get("collection_id"),
        name=updated_item["name"],
        description=updated_item.get("description", ""),
        images=updated_item.get("images", []),
        barcode=updated_item.get("barcode"),
        purchase_price=updated_item.get("purchase_price", 0.0),
        current_value=updated_item.get("current_value", 0.0),
        condition=updated_item.get("condition", "good"),
        is_wishlist=updated_item.get("is_wishlist", False),
        custom_fields=updated_item.get("custom_fields", {}),
        created_at=updated_item["created_at"],
        updated_at=updated_item["updated_at"]
    )

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, user_id: str = Depends(get_current_user)):
    result = await db.items.delete_one({"_id": ObjectId(item_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@api_router.get("/items/search/{query}", response_model=List[ItemResponse])
async def search_items(query: str, user_id: str = Depends(get_current_user)):
    items = await db.items.find({
        "user_id": user_id,
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"barcode": {"$regex": query, "$options": "i"}}
        ]
    }).to_list(1000)
    
    return [ItemResponse(
        id=str(item["_id"]),
        collection_id=item.get("collection_id"),
        name=item["name"],
        description=item.get("description", ""),
        images=item.get("images", []),
        barcode=item.get("barcode"),
        purchase_price=item.get("purchase_price", 0.0),
        current_value=item.get("current_value", 0.0),
        condition=item.get("condition", "good"),
        is_wishlist=item.get("is_wishlist", False),
        custom_fields=item.get("custom_fields", {}),
        created_at=item["created_at"],
        updated_at=item["updated_at"]
    ) for item in items]

# Share Collection Routes
@api_router.post("/share/collection/{collection_id}", response_model=ShareCollectionResponse)
async def share_collection(collection_id: str, user_id: str = Depends(get_current_user)):
    # Verify collection belongs to user
    collection = await db.collections.find_one({"_id": ObjectId(collection_id), "user_id": user_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check if share already exists
    existing_share = await db.shared_collections.find_one({"collection_id": collection_id})
    if existing_share:
        return ShareCollectionResponse(
            share_code=existing_share["share_code"],
            collection_id=collection_id
        )
    
    # Generate unique share code
    import random
    import string
    share_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    # Create share record
    share_dict = {
        "collection_id": collection_id,
        "shared_by": user_id,
        "share_code": share_code,
        "created_at": datetime.utcnow()
    }
    await db.shared_collections.insert_one(share_dict)
    
    return ShareCollectionResponse(
        share_code=share_code,
        collection_id=collection_id
    )

@api_router.get("/share/{share_code}")
async def get_shared_collection(share_code: str):
    # Find shared collection
    shared = await db.shared_collections.find_one({"share_code": share_code})
    if not shared:
        raise HTTPException(status_code=404, detail="Shared collection not found")
    
    # Get collection details
    collection = await db.collections.find_one({"_id": ObjectId(shared["collection_id"])})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get items in collection
    items = await db.items.find({"collection_id": shared["collection_id"]}).to_list(1000)
    
    return {
        "collection": {
            "id": str(collection["_id"]),
            "name": collection["name"],
            "category": collection["category"],
            "description": collection.get("description", "")
        },
        "items": [{
            "id": str(item["_id"]),
            "name": item["name"],
            "description": item.get("description", ""),
            "images": item.get("images", []),
            "condition": item.get("condition", "good"),
            "current_value": item.get("current_value", 0.0)
        } for item in items]
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()