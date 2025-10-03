use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Lobby Entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "lobby")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique, indexed)]
    pub code: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::player::Entity")]
    Player,
    #[sea_orm(has_many = "super::team::Entity")]
    Team,
}

impl Related<super::player::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Player.def()
    }
}

impl Related<super::team::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Team.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

// Module exports for lobby
pub use Entity as Lobby;
pub use Model as LobbyModel;
pub use ActiveModel as LobbyActiveModel;
